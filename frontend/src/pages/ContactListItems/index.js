import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useRef,
} from "react";

import { toast } from "react-toastify";
import { useParams, useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";

import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import BlockIcon from "@material-ui/icons/Block";
import FilterListIcon from "@material-ui/icons/FilterList";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactListItemModal from "../../components/ContactListItemModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import AddFilteredContactsModal from "../../components/AddFilteredContactsModal";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import useContactLists from "../../hooks/useContactLists";
import { Grid, Chip, Typography } from "@material-ui/core";

import planilhaExemplo from "../../assets/planilha.xlsx";
import ForbiddenPage from "../../components/ForbiddenPage";
// import { SocketContext } from "../../context/Socket/SocketContext";


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

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const ContactListItems = () => {
  const classes = useStyles();

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

  const { findById: findContactList } = useContactLists();

  useEffect(() => {
    findContactList(contactListId).then((data) => {
      setContactList(data);
    });
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
  }, [searchParam, pageNumber, contactListId]);

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
        dispatch({ type: "LOAD_CONTACTS", payload: data.records });
      }
    }
    socket.on(`company-${companyId}-ContactListItem`, onCompanyContactLists);

    return () => {
      socket.off(`company-${companyId}-ContactListItem`, onCompanyContactLists);
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

    if (!parts.length) return null;

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
        const { data } = await api.post(`/contact-lists/${contactListId}/sync`);
        toast.success('Sincronização iniciada.');
        // Opcional: recarregar primeira página
        setSearchParam("");
        setPageNumber(1);
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
    <MainContainer className={classes.mainContainer}>
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
            <MainHeader>
              <Grid style={{ width: "99.6%" }} container>
                <Grid xs={12} sm={5} item>
                  <Title>{contactList.name}</Title>
                </Grid>
                <Grid xs={12} sm={7} item>
                  <Grid container alignItems="center" spacing={2}>
                    {/* Campo de busca alinhado à esquerda */}
                    <Grid item xs>
                      <TextField
                        fullWidth
                        placeholder={i18n.t("contactListItems.searchPlaceholder")}
                        type="search"
                        value={searchParam}
                        onChange={handleSearch}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon style={{ color: "gray" }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    {/* Grupo de botões alinhados */}
                    <Grid item>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={goToContactLists}
                        >
                          {i18n.t("contactListItems.buttons.lists")}
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            fileUploadRef.current.value = null;
                            fileUploadRef.current.click();
                          }}
                        >
                          {i18n.t("contactListItems.buttons.import")}
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleOpenFilterModal}
                          startIcon={<FilterListIcon />}
                        >
                          Filtrar
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleOpenContactListItemModal}
                        >
                          {i18n.t("contactListItems.buttons.add")}
                        </Button>
                      </div>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </MainHeader>
            <FilterSummary />
            <Paper
              className={classes.mainPaper}
              variant="outlined"
              onScroll={handleScroll}
            >
              <>
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
              </>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" style={{ width: "0%" }}>
                      #
                    </TableCell>
                    <TableCell>{i18n.t("contactListItems.table.name")}</TableCell>
                    <TableCell align="center">
                      {i18n.t("contactListItems.table.number")}
                    </TableCell>
                    <TableCell align="center">
                      {i18n.t("contactListItems.table.email")}
                    </TableCell>
                    <TableCell align="center">
                      {i18n.t("contactListItems.table.actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell align="center" style={{ width: "0%" }}>
                          <IconButton>
                            {contact.isWhatsappValid ? (
                              <CheckCircleIcon
                                titleAccess="Whatsapp Válido"
                                htmlColor="green"
                              />
                            ) : (
                              <BlockIcon
                                titleAccess="Whatsapp Inválido"
                                htmlColor="grey"
                              />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell>{contact.name}</TableCell>
                        <TableCell align="center">{contact.number}</TableCell>
                        <TableCell align="center">{contact.email}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => hadleEditContact(contact.id)}
                          >
                            <EditIcon />
                          </IconButton>
                          <Can
                            role={user.profile}
                            perform="contacts-page:deleteContact"
                            yes={() => (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setConfirmOpen(true);
                                  setDeletingContact(contact);
                                }}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {loading && <TableRowSkeleton columns={4} />}
                  </>
                </TableBody>
              </Table>
            </Paper>
          </>}
    </MainContainer>
  );
};

export default ContactListItems;
