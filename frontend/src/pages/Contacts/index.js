import React, {
    useState,
    useEffect,
    useReducer,
    useContext,
    useRef,
} from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import {
    Search,
    Trash2,
    Edit,
    Lock,
    Unlock,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    FileUp,
    FileDown,
    Plus,
    Filter,
    X,
    Phone,
} from "lucide-react";
import { Facebook, Instagram, WhatsApp, ArrowDropDown, Backup, ContactPhone } from "@material-ui/icons";
import { Tooltip, Menu, MenuItem } from "@material-ui/core";
import api from "../../services/api";
import { getBackendUrl } from "../../config";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import { i18n } from "../../translate/i18n";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { TagsFilter } from "../../components/TagsFilter";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import formatSerializedId from '../../utils/formatSerializedId';
import { v4 as uuidv4 } from "uuid";

import ContactImportWpModal from "../../components/ContactImportWpModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

const CustomTooltipProps = {
  arrow: true,
  enterTouchDelay: 0,
  leaveTouchDelay: 5000,
  enterDelay: 300,
  leaveDelay: 100,
};

const reducer = (state, action) => {
    if (action.type === "LOAD_CONTACTS") {
        const contacts = action.payload;
        const newContacts = [];

        contacts.forEach((contact) => {
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

        const contactIndex = state.findIndex((c) => c.id === contactId);
        if (contactIndex !== -1) {
            state.splice(contactIndex, 1);
        }
        return [...state];
    }

    if (action.type === "RESET") {
        return [];
    }
};

const Contacts = () => {
    const history = useHistory();

    const { user, socket } = useContext(AuthContext);

    const [loading, setLoading] = useState(false);
    const [pageNumber, setPageNumber] = useState(1);
    const [searchParam, setSearchParam] = useState("");
    const [contacts, dispatch] = useReducer(reducer, []);
    const [selectedContactId, setSelectedContactId] = useState(null);
    const [contactModalOpen, setContactModalOpen] = useState(false);

    const [importContactModalOpen, setImportContactModalOpen] = useState(false);
    const [deletingContact, setDeletingContact] = useState(null);
    const [ImportContacts, setImportContacts] = useState(null);
    
    const [blockingContact, setBlockingContact] = useState(null);
    const [unBlockingContact, setUnBlockingContact] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [exportContact, setExportContact] = useState(false);
    const [confirmChatsOpen, setConfirmChatsOpen] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
    const [contactTicket, setContactTicket] = useState({});
    const fileUploadRef = useRef(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const { setCurrentTicket } = useContext(TicketsContext);

    const [importWhatsappId, setImportWhatsappId] = useState()

    // NOVOS ESTADOS PARA SELEÇÃO E DELEÇÃO EM MASSA
    const [selectedContactIds, setSelectedContactIds] = useState([]); // Array de IDs dos contatos selecionados
    const [isSelectAllChecked, setIsSelectAllChecked] = useState(false); // Estado para o checkbox "Selecionar Tudo"
    const [confirmDeleteManyOpen, setConfirmDeleteManyOpen] = useState(false); // Estado para o modal de confirmação de deleção em massa

    const { getAll: getAllSettings } = useCompanySettings();
    const [hideNum, setHideNum] = useState(false);
    const [enableLGPD, setEnableLGPD] = useState(false);

    // Placeholder for total contacts, should be fetched from API
    const [totalContacts, setTotalContacts] = useState(3000); 
    const [contactsPerPage, setContactsPerPage] = useState(25);

    useEffect(() => {
        async function fetchData() {
            const settingList = await getAllSettings(user.companyId);
            for (const [key, value] of Object.entries(settingList)) {
                if (key === "enableLGPD") setEnableLGPD(value === "enabled");
                if (key === "lgpdHideNumber") setHideNum(value === "enabled");
            }
        }
        fetchData();
    }, []);

    const handleImportExcel = async () => {
        try {
            const formData = new FormData();
            formData.append("file", fileUploadRef.current.files[0]);
            await api.request({
                url: `/contacts/upload`,
                method: "POST",
                data: formData,
            });
            history.go(0);
        } catch (err) {
            toastError(err);
        }
    };

    useEffect(() => {
        dispatch({ type: "RESET" });
        setPageNumber(1);
        setSelectedContactIds([]); // Limpar seleção ao mudar filtro/pesquisa
        setIsSelectAllChecked(false); // Desmarcar "Selecionar Tudo"
    }, [searchParam, selectedTags]);

                    useEffect(() => {
                        setLoading(true);
                        const delayDebounceFn = setTimeout(() => {
                            const fetchContacts = async () => {
                                try {
                                    const { data } = await api.get("/contacts/", {
                                        params: { searchParam, pageNumber, contactTag: JSON.stringify(selectedTags) },
                                    });
                                    dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
                                    setHasMore(data.hasMore);
                                    setTotalContacts(data.total || data.contacts.length); // Atualiza totalContacts dinamicamente
                                    setLoading(false);

                                    // Atualizar o estado do "Selecionar Tudo" baseado nos contatos carregados e selecionados
                                    const allCurrentContactIds = data.contacts.map(c => c.id);
                                    const newSelected = selectedContactIds.filter(id => allCurrentContactIds.includes(id));
                                    setSelectedContactIds(newSelected); // Mantenha apenas os IDs que ainda estão na lista
                                    setIsSelectAllChecked(newSelected.length === allCurrentContactIds.length && allCurrentContactIds.length > 0);

                                } catch (err) {
                                    toastError(err);
                                }
                            };
                            fetchContacts();
                        }, 500);
                        return () => clearTimeout(delayDebounceFn);
                    }, [searchParam, pageNumber, selectedTags]);

    useEffect(() => {
        const companyId = user.companyId;
        const onContactEvent = (data) => {
            if (data.action === "update" || data.action === "create") {
                dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
            }

        if (data.action === "delete") {
            const contactIdNum = Number(data.contactId);
            dispatch({ type: "DELETE_CONTACT", payload: contactIdNum });
            // Remover o contato deletado da lista de selecionados, se estiver lá
            setSelectedContactIds((prevSelected) =>
                prevSelected.filter((id) => id !== contactIdNum)
            );
        }
        };
        socket.on(`company-${companyId}-contact`, onContactEvent);

        return () => {
            socket.off(`company-${companyId}-contact`, onContactEvent);
        };
    }, [socket]);

    const handleSelectTicket = (ticket) => {
        const code = uuidv4();
        const { id, uuid } = ticket;
        setCurrentTicket({ id, uuid, code });
    }

    const handleCloseOrOpenTicket = (ticket) => {
        setNewTicketModalOpen(false);
        if (ticket !== undefined && ticket.uuid !== undefined) {
            handleSelectTicket(ticket);
            history.push(`/tickets/${ticket.uuid}`);
        }
    };

    const handleSelectedTags = (selecteds) => {
        const tags = selecteds.map((t) => t.id);
        setSelectedTags(tags);
    };

    const handleSearch = (event) => {
        setSearchParam(event.target.value.toLowerCase());
    };

    const handleOpenContactModal = () => {
        setSelectedContactId(null);
        setContactModalOpen(true);
    };

    const handleCloseContactModal = () => {
        setSelectedContactId(null);
        setContactModalOpen(false);
    };

    const hadleEditContact = (contactId) => {
        setSelectedContactId(contactId);
        setContactModalOpen(true);
    };

    const handleDeleteContact = async (contactId) => {
        try {
            await api.delete(`/contacts/${contactId}`);
            toast.success(i18n.t("contacts.toasts.deleted"));
        } catch (err) {
            toastError(err);
        }
        setDeletingContact(null);
    };

    // NOVA FUNÇÃO: SELECIONAR UM CONTATO INDIVIDUALMENTE
    const handleToggleSelectContact = (contactId) => (event) => {
        if (event.target.checked) {
            setSelectedContactIds((prevSelected) => [...prevSelected, contactId]);
        } else {
            setSelectedContactIds((prevSelected) => prevSelected.filter((id) => id !== contactId));
            setIsSelectAllChecked(false); // Se um individual é desmarcado, "Selecionar Tudo" deve ser desmarcado
        }
    };

    // NOVA FUNÇÃO: SELECIONAR/DESSELECIONAR TODOS OS CONTATOS
    const handleSelectAllContacts = (event) => {
        const checked = event.target.checked;
        setIsSelectAllChecked(checked);

        if (checked) {
            // Seleciona todos os IDs dos contatos atualmente carregados
            const allContactIds = contacts.map((contact) => contact.id);
            setSelectedContactIds(allContactIds);
        } else {
            setSelectedContactIds([]);
        }
    };

    // NOVA FUNÇÃO: DELETAR CONTATOS SELECIONADOS EM MASSA
    const handleDeleteSelectedContacts = async () => {
        try {
            setLoading(true);
            await api.delete("/contacts/batch-delete", {
                data: { contactIds: selectedContactIds } // Envia os IDs no corpo da requisição DELETE
            });
            toast.success("Contatos selecionados deletados com sucesso!");
            setSelectedContactIds([]); // Limpa a seleção
            setIsSelectAllChecked(false); // Desmarca o "Selecionar Tudo"
            setConfirmDeleteManyOpen(false); // Fecha o modal de confirmação
            // Re-fetch os contatos para atualizar a lista
            dispatch({ type: "RESET" });
            setPageNumber(1);
        } catch (err) {
            toastError(err);
        } finally {
            setLoading(false);
        }
    };


    const handleBlockContact = async (contactId) => {
        try {
            await api.put(`/contacts/block/${contactId}`, { active: false });
            toast.success("Contato bloqueado");
        } catch (err) {
            toastError(err);
        }
        setSearchParam("");
        setPageNumber(1);
        setBlockingContact(null);
    };

    const handleUnBlockContact = async (contactId) => {
        try {
            await api.put(`/contacts/block/${contactId}`, { active: true });
            toast.success("Contato desbloqueado");
        } catch (err) {
            toastError(err);
        }
        setSearchParam("");
        setPageNumber(1);
        setUnBlockingContact(null);
    };

    const onSave = (whatsappId) => {
        setImportWhatsappId(whatsappId)
    }

    const handleimportContact = async () => {
        setImportContactModalOpen(false)

        try {
            await api.post("/contacts/import", { whatsappId: importWhatsappId });
            history.go(0);
            setImportContactModalOpen(false);
        } catch (err) {
            toastError(err);
            setImportContactModalOpen(false);
        }
    };

    const handleimportChats = async () => {
        console.log("handleimportChats")
        try {
            await api.post("/contacts/import/chats");
            history.go(0);
        } catch (err) {
            toastError(err);
        }
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

    // Função para lidar com a navegação de página
    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setPageNumber(page);
        }
    };

    // Calcula o número total de páginas
    const totalPages = totalContacts === 0 ? 1 : Math.ceil(totalContacts / contactsPerPage);

    // Função para renderizar os números de página com limite

        const renderPageNumbers = () => {
            const pages = [];
            if (totalPages <= 3) {
                for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1, 2, 3, "...");
            }
            return pages.map((page, index) => (
            <li key={index}>
                {page === "..." ? (
                    <span className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 dark:bg-gray-800 dark:border-gray-700">...</span>
                ) : (
                    <button
                        onClick={() => handlePageChange(page)}
                        className={`flex items-center justify-center px-3 h-8 leading-tight border
                            ${page === pageNumber
                                ? "text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                                : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                            }`}
                    >
                        {page}
                    </button>
                )}
            </li>
        ));
    };

    return (
        <MainContainer>
<div className="w-full h-full p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900" onScroll={handleScroll}>
                <NewTicketModal
                    modalOpen={newTicketModalOpen}
                    initialContact={contactTicket}
                    onClose={(ticket) => {
                        handleCloseOrOpenTicket(ticket);
                    }}
                />
                <ContactModal
                    open={contactModalOpen}
                    onClose={handleCloseContactModal}
                    aria-labelledby="form-dialog-title"
                    contactId={selectedContactId}
                ></ContactModal>

                <ContactImportWpModal
                    isOpen={importContactModalOpen}
                    handleClose={() => setImportContactModalOpen(false)}
                />

                <ConfirmationModal
                    title={
                        deletingContact
                            ? `${i18n.t(
                                "contacts.confirmationModal.deleteTitle"
                            )} ${deletingContact.name}?`
                            : blockingContact
                                ? `Bloquear Contato ${blockingContact.name}?`
                                : unBlockingContact
                                    ? `Desbloquear Contato ${unBlockingContact.name}?`
                                    : ImportContacts
                                        ? `${i18n.t("contacts.confirmationModal.importTitlte")}`
                                        : `${i18n.t("contactListItems.confirmationModal.importTitlte")}`
                    }
                    onSave={onSave}
                    isCellPhone={ImportContacts}
                    open={confirmOpen}
                    onClose={setConfirmOpen}
                    onConfirm={(e) =>
                        deletingContact
                            ? handleDeleteContact(deletingContact.id)
                            : blockingContact
                                ? handleBlockContact(blockingContact.id)
                                : unBlockingContact
                                    ? handleUnBlockContact(unBlockingContact.id)
                                    : ImportContacts
                                        ? handleimportContact()
                                        : handleImportExcel()
                    }
                >
                    {exportContact
                        ? `${i18n.t("contacts.confirmationModal.exportContact")}`
                        : deletingContact
                            ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
                            : blockingContact
                                ? `${i18n.t("contacts.confirmationModal.blockContact")}`
                                : unBlockingContact
                                    ? `${i18n.t("contacts.confirmationModal.unblockContact")}`
                                    : ImportContacts
                                        ? `Escolha de qual conexão deseja importar`
                                        : `${i18n.t("contactListItems.confirmationModal.importMessage")}`}
                </ConfirmationModal>

                {/* NOVO MODAL DE CONFIRMAÇÃO PARA DELEÇÃO EM MASSA */}
                <ConfirmationModal
                    title={`Tem certeza que deseja deletar ${selectedContactIds.length} contatos selecionados?`}
                    open={confirmDeleteManyOpen}
                    onClose={() => setConfirmDeleteManyOpen(false)}
                    onConfirm={handleDeleteSelectedContacts}
                >
                    Essa ação é irreversível.
                </ConfirmationModal>

                <ConfirmationModal
                    title={i18n.t("contacts.confirmationModal.importChat")}
                    open={confirmChatsOpen}
                    onClose={setConfirmChatsOpen}
                    onConfirm={(e) => handleimportChats()}
                >
                    {i18n.t("contacts.confirmationModal.wantImport")}
                </ConfirmationModal>

                {/* Cabeçalho */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                        {i18n.t("contacts.title")}
                        <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
                            ({contacts.length})
                        </span>
                    </h1>
                </header>

                {/* Barra de Ações e Filtros */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3 md:flex-nowrap">
                    {/* Filtros e Busca (Esquerda) */}
                    <div className="w-full flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative">
                            <TagsFilter onFiltered={handleSelectedTags} />
                        </div>

                        {/* Busca com largura limitada */}
                        <div className="relative flex-1 min-w-[260px] max-w-[620px]">
                            <input
                                type="text"
                                placeholder="Buscar por nome, telefone, cidade, cnpj/cpf, cod. representante ou email..."
                                value={searchParam}
                                onChange={handleSearch}
                                className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Ações Principais (Direita) */}
                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 flex-none whitespace-nowrap">
                        <PopupState variant="popover" popupId="demo-popup-menu">
                            {(popupState) => (
                                <>
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                                        {...bindTrigger(popupState)}
                                    >
                                        Importar/Exportar
                                        <ArrowDropDown />
                                    </button>
                                    <Menu {...bindMenu(popupState)}>
                                        <MenuItem onClick={() => { setConfirmOpen(true); setImportContacts(true); popupState.close(); }}>
                                            <ContactPhone fontSize="small" color="primary" style={{ marginRight: 10 }} />
                                            {i18n.t("contacts.menu.importYourPhone")}
                                        </MenuItem>
                                        <MenuItem onClick={() => { setImportContactModalOpen(true) }}>
                                            <Backup fontSize="small" color="primary" style={{ marginRight: 10 }} />
                                            {i18n.t("contacts.menu.importToExcel")}
                                        </MenuItem>
                                    </Menu>
                                </>
                            )}
                        </PopupState>

                        <button
                            onClick={() => setConfirmDeleteManyOpen(true)}
                            disabled={selectedContactIds.length === 0 || loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar ({selectedContactIds.length})
                        </button>

                        <button
                            onClick={handleOpenContactModal}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Contato
                        </button>
                    </div>
                </div>

                {/* Tabela de Contatos (Desktop) */}
                <div className="hidden md:block bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="p-4">
                                        <input type="checkbox"
                                            checked={isSelectAllChecked}
                                            onChange={handleSelectAllContacts}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                    </th>
                                    <th scope="col" className="px-6 py-3">Nome</th>
                                    <th scope="col" className="px-2 py-3">WhatsApp</th>
                                    <th scope="col" className="px-6 py-3">Email</th>
                                    <th scope="col" className="px-6 py-3">Cidade/UF</th>
                                    <th scope="col" className="px-6 py-3">Tags</th>
                                    <th scope="col" className="px-2 py-3 text-center">Status</th>
                                    <th scope="col" className="px-2 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.map((contact) => (
                                    <tr key={contact.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="w-4 p-4">
                                            <input type="checkbox"
                                                checked={selectedContactIds.includes(contact.id)}
                                                onChange={handleToggleSelectContact(contact.id)}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                        </td>
<td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center gap-3 max-w-[200px] overflow-hidden text-ellipsis">
                                            <Tooltip {...CustomTooltipProps} title={contact.name}>
                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 flex-shrink-0 overflow-hidden">
                                                    {contact.urlPicture ? (
                                                        <img
                                                            src={`${getBackendUrl()}/public/company${contact.companyId}/contacts/${contact.urlPicture}`}
                                                            alt={contact.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                            onError={(e) => {
                                                                // Se falhar, tenta carregar a imagem de perfil do WhatsApp
                                                                if (contact.profilePicUrl && !e.target.src.includes(contact.profilePicUrl)) {
                                                                    e.target.src = contact.profilePicUrl;
                                                                } else {
                                                                    // Se não tiver imagem de perfil, usa a imagem padrão
                                                                    e.target.onerror = null;
                                                                    e.target.src = "/nopicture.png";
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        contact.name.charAt(0)
                                                    )}
                                                </div>
                                            </Tooltip>
                                            <Tooltip {...CustomTooltipProps} title={contact.name}>
                                                <span className="truncate" style={{maxWidth: 'calc(100% - 40px)'}}>
                                                    {contact.name}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-2 py-4">
                                            {formatPhoneNumber(contact.number)}
                                        </td>
<td className="px-6 py-4 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                                            <Tooltip {...CustomTooltipProps} title={contact.email}>
                                                <span className="truncate">{contact.email}</span>
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4">{contact.city}</td>
                                            <td className="px-6 py-4" title={contact.tags.length > 2 ? contact.tags.slice(2).map(t => t.name).join(", ") : ""}>
                                                <div className="flex items-center gap-1">
                                                    {contact.tags.slice(0, 2).map((tag) => (
                                                        <span
                                                            key={tag.id}
                                                            className="px-2 py-1 text-xs font-medium text-white rounded-full"
                                                            style={{ backgroundColor: tag.color }}
                                                        >
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                {contact.tags.length > 2 && (
                                                    <Tooltip {...CustomTooltipProps} title={contact.tags.slice(2).map(t => t.name).join(", ")}>
                                                        <span className="px-2 py-1 text-xs font-medium text-white rounded-full bg-gray-400 dark:bg-gray-600 cursor-default select-none">
                                                            ...
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${contact.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                                {contact.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Tooltip {...CustomTooltipProps} title="Enviar mensagem pelo WhatsApp">
                                                    <button onClick={() => { setContactTicket(contact); setNewTicketModalOpen(true); }} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">
                                                        <WhatsApp className="w-5 h-5" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip {...CustomTooltipProps} title="Editar contato">
                                                    <button onClick={() => hadleEditContact(contact.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip {...CustomTooltipProps} title={contact.active ? "Bloquear contato" : "Desbloquear contato"}>
                                                    <button onClick={contact.active ? () => { setBlockingContact(contact); setConfirmOpen(true); } : () => { setUnBlockingContact(contact); setConfirmOpen(true); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                                                        {contact.active ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                                                    </button>
                                                </Tooltip>
                                                <Tooltip {...CustomTooltipProps} title="Deletar contato">
                                                    <button onClick={() => { setDeletingContact(contact); setConfirmOpen(true); }} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {loading && <TableRowSkeleton avatar columns={7} />}
                            </tbody>
                        </table>
                    </div>
                    {/* Paginação da Tabela */}
                    <nav className="flex items-center justify-between p-4" aria-label="Table navigation">
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                            Página{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {pageNumber}-{pageNumber}
                            </span>{" "}
                            de{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {totalContacts}
                            </span>{" "}
                            Contatos
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">Itens por página:</span>
                            <select
                                value={contactsPerPage}
                                onChange={(e) => {
                                    setContactsPerPage(Number(e.target.value));
                                    setPageNumber(1); // Reset to first page when items per page changes
                                }}
                                className="text-sm bg-gray-50 border border-gray-300 rounded-md p-1 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <ul className="inline-flex items-center -space-x-px">
                            <li>
                                <button
                                    onClick={() => handlePageChange(1)}
                                    disabled={pageNumber === 1}
                                    className="flex items-center justify-center px-3 h-8 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsLeft className="w-5 h-5" />
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => handlePageChange(pageNumber - 1)}
                                    disabled={pageNumber === 1}
                                    className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            </li>
                            {renderPageNumbers()}
                            <li>
                                <button
                                    onClick={() => handlePageChange(pageNumber + 1)}
                                    disabled={pageNumber === totalPages}
                                    className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={pageNumber === totalPages}
                                    className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsRight className="w-5 h-5" />
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>

                {/* Lista de Contatos (Mobile) */}
                <div className="md:hidden flex flex-col gap-2 mt-4">
                    {contacts.map((contact) => (
                        <div key={contact.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 overflow-hidden flex-shrink-0">
                                {contact.urlPicture ? (
                                    <img
                                        src={`${getBackendUrl()}/public/company${contact.companyId}/contacts/${contact.urlPicture}`}
                                        alt={contact.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                        onError={(e) => {
                                            // Se falhar, tenta carregar a imagem de perfil do WhatsApp
                                            if (contact.profilePicUrl && !e.target.src.includes(contact.profilePicUrl)) {
                                                e.target.src = contact.profilePicUrl;
                                            } else {
                                                // Se não tiver imagem de perfil, usa a imagem padrão
                                                e.target.onerror = null;
                                                e.target.src = "/nopicture.png";
                                            }
                                        }}
                                    />
                                ) : (
                                    contact.name.charAt(0)
                                )}
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
                                <button onClick={() => { setContactTicket(contact); setNewTicketModalOpen(true); }} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"><WhatsApp className="w-5 h-5" /></button>
                                <button onClick={() => hadleEditContact(contact.id)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><Edit className="w-5 h-5" /></button>
                                <button onClick={contact.active ? () => { setBlockingContact(contact); setConfirmOpen(true); } : () => { setUnBlockingContact(contact); setConfirmOpen(true); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                                    {contact.active ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                                </button>
                                <button onClick={() => { setDeletingContact(contact); setConfirmOpen(true); }} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </MainContainer>
    );
};

export default Contacts;
