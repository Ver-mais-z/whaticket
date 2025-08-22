import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useRef,
} from "react";

import { toast } from "react-toastify";
import { useParams, useHistory } from "react-router-dom";
import Button from "@material-ui/core/Button";
 

 
 

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactListItemModal from "../../components/ContactListItemModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import AddFilteredContactsModal from "../../components/AddFilteredContactsModal";

import { i18n } from "../../translate/i18n";
 
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import useContactLists from "../../hooks/useContactLists";
import { Chip, Typography, Tooltip } from "@material-ui/core";
import ContactAvatar from "../../components/ContactAvatar";
import { Search, List as ListIcon, Upload as UploadIcon, Filter as FilterIcon, Plus as PlusIcon, Edit, Trash2, CheckCircle, Ban } from "lucide-react";

import planilhaExemplo from "../../assets/planilha.xlsx";
import ForbiddenPage from "../../components/ForbiddenPage";
// import { SocketContext } from "../../context/Socket/SocketContext";


// Tooltips consistentes com a página Contacts
const CustomTooltipProps = {
  arrow: true,
  enterTouchDelay: 0,
  leaveTouchDelay: 5000,
  enterDelay: 300,
  leaveDelay: 100,
};

const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const incoming = Array.isArray(action.payload)
      ? action.payload
      : action.payload
      ? [action.payload]
      : [];
    const newContacts = [];

    incoming.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    if (!contact) return state;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;
    if (contactId == null) return state;

    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const ContactListItems = () => {
  

  //   const socketManager = useContext(SocketContext);
  const { user, socket } = useContext(AuthContext);

  const { contactListId } = useParams();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactListItemModalOpen, setContactListItemModalOpen] =
    useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [contactList, setContactList] = useState({});
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const fileUploadRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  

  const { findById: findContactList } = useContactLists();


  const refreshContactList = () => {
    findContactList(contactListId).then((data) => {
      setContactList(data);
    });
  };

  useEffect(() => {
    refreshContactList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactListId]);

  // Carrega tags apenas se necessário para exibir nomes no resumo do filtro
  useEffect(() => {
    const loadTags = async () => {
      try {
        const { data } = await api.get("/tags");
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.tags) ? data.tags : []);
        setAllTags(list);
      } catch (err) {
        // silencioso no resumo
      }
    };
    if (contactList && contactList.savedFilter && Array.isArray(contactList.savedFilter.tags)) {
      loadTags();
    }
  }, [contactList]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get(`contact-list-items`, {
            params: { searchParam, pageNumber, contactListId },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, contactListId, refreshKey]);


  useEffect(() => {
    const companyId = user.companyId;
    // const socket = socketManager.GetSocket();

    const onCompanyContactLists = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.record });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.id });
      }

      if (data.action === "reload") {
        // Evitar anexar listas grandes via socket. Força refetch da página 1.
        dispatch({ type: "RESET" });
        setPageNumber(1);
        setRefreshKey(k => k + 1);
      }
    }
    socket.on(`company-${companyId}-ContactListItem`, onCompanyContactLists);

    // Atualiza metadados da lista (ex.: savedFilter) quando houver atualizações na ContactList
    const onCompanyContactList = (data) => {
      if (data.action === "update" && data.record && data.record.id === Number(contactListId)) {
        setContactList(data.record);
      }
    };
    socket.on(`company-${companyId}-ContactList`, onCompanyContactList);

    return () => {
      socket.off(`company-${companyId}-ContactListItem`, onCompanyContactLists);
      socket.off(`company-${companyId}-ContactList`, onCompanyContactList);
    };
  }, [contactListId]);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactListItemModal = () => {
    setSelectedContactId(null);
    setContactListItemModalOpen(true);
  };

  const handleCloseContactListItemModal = () => {
    setSelectedContactId(null);
    setContactListItemModalOpen(false);
  };

  const hadleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactListItemModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contact-list-items/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleImportContacts = async () => {
    try {
      const formData = new FormData();
      formData.append("file", fileUploadRef.current.files[0]);
      await api.request({
        url: `contact-lists/${contactListId}/upload`,
        method: "POST",
        data: formData,
      });
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenFilterModal = () => {
    setFilterModalOpen(true);
  };

  const handleCloseFilterModal = () => {
    setFilterModalOpen(false);
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };


  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const goToContactLists = () => {
    history.push("/contact-lists");
  };

  const monthsPT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const formatCurrency = (val) => {
    if (val == null || val === "") return null;
    const num = Number(String(val).replace(/\./g, '').replace(/,/g, '.'));
    if (isNaN(num)) return String(val);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
  };

  const formatPhoneNumber = (number) => {
    if (!number) return "";
    const cleaned = ('' + number).replace(/\D/g, '');
    if (cleaned.startsWith("55") && cleaned.length === 13) {
      const match = cleaned.match(/^(\d{2})(\d{2})(\d{5})(\d{4})$/);
      if (match) {
        return `BR (${match[2]}) ${match[3]}-${match[4]}`;
      }
    }
    return number;
  };

  const FilterSummary = () => {
    const f = contactList && contactList.savedFilter;
    if (!f) return null;

    const parts = [];
    if (Array.isArray(f.channel) && f.channel.length) parts.push({ label: 'Canal', values: f.channel });
    if (Array.isArray(f.representativeCode) && f.representativeCode.length) parts.push({ label: 'Representante', values: f.representativeCode });
    if (Array.isArray(f.city) && f.city.length) parts.push({ label: 'Cidade', values: f.city });
    if (Array.isArray(f.situation) && f.situation.length) parts.push({ label: 'Situação', values: f.situation });
    if (Array.isArray(f.foundationMonths) && f.foundationMonths.length) parts.push({ label: 'Fundação', values: f.foundationMonths.map(m => monthsPT[m-1]).filter(Boolean) });
    if (f.minCreditLimit || f.maxCreditLimit) {
      const min = formatCurrency(f.minCreditLimit) || '—';
      const max = formatCurrency(f.maxCreditLimit) || '—';
      parts.push({ label: 'Limite', values: [`${min} – ${max}`] });
    }
    if (Array.isArray(f.tags) && f.tags.length) {
      const tagNames = allTags.length ? allTags.filter(t => f.tags.includes(t.id)).map(t => t.name) : f.tags.map(id => `#${id}`);
      parts.push({ label: 'Tags', values: tagNames });
    }
    // Mesmo que não haja partes reconhecíveis, exibir controles de sincronização
    const handleDisableAutoUpdate = async () => {
      try {
        await api.put(`/contact-lists/${contactListId}`, { savedFilter: null });
        const updated = await findContactList(contactListId);
        setContactList(updated);
        toast.success('Autoatualização desativada.');
      } catch (err) {
        toastError(err);
      }
    };

    const handleSyncNow = async () => {
      try {
        await api.post(`/contact-lists/${contactListId}/sync`);
        toast.success('Sincronização iniciada.');
        // Recarregar lista sem F5
        dispatch({ type: "RESET" });
        setSearchParam("");
        setPageNumber(1);
        setRefreshKey(k => k + 1);
      } catch (err) {
        toastError(err);
      }
    };

    return (
      <div style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, rowGap: 6 }}>
          <Typography variant="caption" style={{ color: '#666' }}>
            Filtro salvo:
          </Typography>
          {parts.map((p, idx) => (
            <React.Fragment key={p.label}>
              {idx > 0 && (
                <Typography variant="caption" style={{ color: '#999' }}>{'>'}</Typography>
              )}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Typography variant="caption" style={{ fontWeight: 600 }}>{p.label}:</Typography>
                {p.values.map((v, i) => (
                  <Chip key={`${p.label}-${i}`} size="small" label={v} />
                ))}
              </div>
            </React.Fragment>
          ))}
          <Chip size="small" label="Auto-atualiza diariamente" color="primary" variant="outlined" />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button size="small" variant="outlined" color="primary" onClick={handleSyncNow}>
              Sincronizar agora
            </Button>
            <Button size="small" variant="outlined" color="secondary" onClick={handleDisableAutoUpdate}>
              Desativar autoatualização
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainContainer>
      <div className="w-full h-full p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 overflow-y-auto" onScroll={handleScroll}>
      <ContactListItemModal
        open={contactListItemModalOpen}
        onClose={handleCloseContactListItemModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
      />
      <AddFilteredContactsModal
        open={filterModalOpen}
        onClose={handleCloseFilterModal}
        contactListId={contactListId}
        savedFilter={contactList && contactList.savedFilter}
        reload={() => {
          setSearchParam("");
          setPageNumber(1);
          refreshContactList();
        }}
      />
      <ConfirmationModal
        title={
          deletingContact
            ? `${i18n.t("contactListItems.confirmationModal.deleteTitle")} ${deletingContact.name
            }?`
            : `${i18n.t("contactListItems.confirmationModal.importTitlte")}`
        }
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={() =>
          deletingContact
            ? handleDeleteContact(deletingContact.id)
            : handleImportContacts()
        }
      >
        {deletingContact ? (
          `${i18n.t("contactListItems.confirmationModal.deleteMessage")}`
        ) : (
          <>
            {i18n.t("contactListItems.confirmationModal.importMessage")}
            <a href={planilhaExemplo} download="planilha.xlsx">
              Clique aqui para baixar planilha exemplo.
            </a>
          </>
        )}
      </ConfirmationModal>
      {
        user.profile === "user" ?
          <ForbiddenPage />
          :
          <>
            {/* Cabeçalho */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                {contactList.name}
              </h1>
            </header>

            {/* Barra de Ações e Filtros */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 md:flex-nowrap">
              {/* Busca (Esquerda) */}
              <div className="w-full flex items-center gap-2 flex-1 min-w-0 justify-start">
                <div className="relative flex-1 min-w-[260px] max-w-[620px]">
                  <input
                    type="text"
                    placeholder={i18n.t("contactListItems.searchPlaceholder")}
                    value={searchParam}
                    onChange={handleSearch}
                    className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Ações (Direita) */}
              <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 flex-none whitespace-nowrap items-center">
                <button
                  onClick={goToContactLists}
                  className="px-4 py-2 text-sm font-semibold uppercase text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                >
                  <ListIcon className="w-4 h-4 mr-2" />
                  {i18n.t("contactListItems.buttons.lists")}
                </button>
                <button
                  onClick={() => { fileUploadRef.current.value = null; fileUploadRef.current.click(); }}
                  className="px-4 py-2 text-sm font-semibold uppercase text-white bg-pink-300 hover:bg-pink-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 flex items-center"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  {i18n.t("contactListItems.buttons.import")}
                </button>
                <button
                  onClick={handleOpenFilterModal}
                  className="px-4 py-2 text-sm font-semibold uppercase text-white bg-green-600 hover:bg-green-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center"
                >
                  <FilterIcon className="w-4 h-4 mr-2" />
                  Filtrar
                </button>
                <button
                  onClick={handleOpenContactListItemModal}
                  className="px-4 py-2 text-sm font-semibold uppercase text-white bg-green-400 hover:bg-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 flex items-center"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  {i18n.t("contactListItems.buttons.add")}
                </button>
              </div>
            </div>

            {/* Resumo de Filtro e botões extras */}
            <FilterSummary />
            {/* Input de upload oculto */}
            <input
              style={{ display: "none" }}
              id="upload"
              name="file"
              type="file"
              accept=".xls,.xlsx"
              onChange={() => {
                setConfirmOpen(true);
              }}
              ref={fileUploadRef}
            />

            {/* Tabela (Desktop) */}
            <div className="hidden md:block bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-2 py-3 text-center">#</th>
                      <th scope="col" className="px-6 py-3">Nome</th>
                      <th scope="col" className="px-2 py-3 text-center">WhatsApp</th>
                      <th scope="col" className="px-6 py-3">Email</th>
                      <th scope="col" className="px-2 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-2 py-4 text-center">
                          {contact.isWhatsappValid ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Ban className="w-5 h-5 text-gray-400" />
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center gap-3 max-w-[200px] overflow-hidden text-ellipsis">
                          <Tooltip {...CustomTooltipProps} title={contact.name}>
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 flex-shrink-0 overflow-hidden">
                              <ContactAvatar 
                                contact={contact.contact || contact}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            </div>
                          </Tooltip>
                          <Tooltip {...CustomTooltipProps} title={contact.name}>
                            <span className="truncate" style={{maxWidth: 'calc(100% - 40px)'}}>
                              {contact.name}
                            </span>
                          </Tooltip>
                        </td>
                        <td className="px-2 py-4 text-center">{formatPhoneNumber(contact.number)}</td>
                        <td className="px-6 py-4 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                          <Tooltip {...CustomTooltipProps} title={contact.email}>
                            <span className="truncate">{contact.email}</span>
                          </Tooltip>
                        </td>
                        <td className="px-2 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Tooltip {...CustomTooltipProps} title="Editar">
                              <button onClick={() => hadleEditContact(contact.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                <Edit className="w-5 h-5" />
                              </button>
                            </Tooltip>
                            <Can
                              role={user.profile}
                              perform="contacts-page:deleteContact"
                              yes={() => (
                                <Tooltip {...CustomTooltipProps} title="Excluir">
                                  <button onClick={() => { setConfirmOpen(true); setDeletingContact(contact); }} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </Tooltip>
                              )}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {loading && <TableRowSkeleton avatar columns={5} />}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lista (Mobile) */}
            <div className="md:hidden flex flex-col gap-2 mt-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center">
                    {contact.isWhatsappValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Ban className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 overflow-hidden flex-shrink-0">
                    <ContactAvatar 
                      contact={contact.contact || contact}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-gray-900 dark:text-white truncate" title={contact.name}>
                      {contact.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate" title={contact.email}>
                      {contact.email}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {formatPhoneNumber(contact.number)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => hadleEditContact(contact.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><Edit className="w-5 h-5" /></button>
                    <button onClick={() => { setConfirmOpen(true); setDeletingContact(contact); }} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
      }
      </div>
    </MainContainer>
  );
};

export default ContactListItems;
