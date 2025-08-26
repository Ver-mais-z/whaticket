import React, {
    useState,
    useEffect,
    useReducer,
    useContext,
    useRef,
} from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import useContactUpdates from "../../hooks/useContactUpdates";

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
    UserPlus,
    Filter,
    X,
    Phone,
} from "lucide-react";
import { Facebook, Instagram, WhatsApp, ImportExport, Backup, ContactPhone } from "@material-ui/icons";
import { Tooltip, Menu, MenuItem } from "@material-ui/core";
import api from "../../services/api";
import ContactAvatar from "../../components/ContactAvatar";
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
    if (action.type === "SET_CONTACTS") {
        // Substitui completamente a lista de contatos (paginação por página)
        return [...action.payload];
    }
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
                                        params: { searchParam, pageNumber, contactTag: JSON.stringify(selectedTags), limit: contactsPerPage, isGroup: "false" },
                                    });
                                    // Substitui a lista pelo resultado da página atual
                                    dispatch({ type: "SET_CONTACTS", payload: data.contacts });
                                    setHasMore(data.hasMore);
                                    setTotalContacts(typeof data.count === 'number' ? data.count : (data.total || data.contacts.length));
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
                    }, [searchParam, pageNumber, selectedTags, contactsPerPage]);

    // Hook para atualização em tempo real de avatares
    useContactUpdates((updatedContact) => {
        dispatch({ type: "UPDATE_CONTACTS", payload: updatedContact });
    });

    // Atualização silenciosa de avatares ao carregar a página
    useEffect(() => {
        const refreshAvatars = async () => {
            if (contacts.length > 0) {
                try {
                    const contactIds = contacts.map(c => c.id);
                    await api.post('/contacts/bulk-refresh-avatars', {
                        contactIds: contactIds.slice(0, 20) // Limita a 20 contatos por vez
                    });
                } catch (error) {
                    // Falha silenciosa - não mostra erro ao usuário
                    console.log('Falha na atualização silenciosa de avatares:', error);
                }
            }
        };

        // Executa após 2 segundos da página carregar
        const timer = setTimeout(refreshAvatars, 2000);
        return () => clearTimeout(timer);
    }, [contacts.length > 0]); // Executa quando contatos são carregados

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

    // Removido infinite scroll para manter paginação fixa por página

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

    // Trunca texto para um tamanho máximo e adiciona reticências
    const truncateText = (text, max = 50) => {
        if (!text) return "";
        const str = String(text);
        return str.length > max ? str.slice(0, max) + "..." : str;
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
        <MainContainer useWindowScroll>
<div className="w-full p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
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

                {/* Barra de Ações e Filtros - Mobile (2 linhas) */}
                <div className="min-[1200px]:hidden flex flex-col gap-2 w-full max-w-md mx-auto">
                    {/* Linha 1: Filtros + Botões */}
                    <div className="w-full flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-0">
                            <TagsFilter onFiltered={handleSelectedTags} />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <PopupState variant="popover" popupId="contacts-import-export-menu-mobile">
                                {(popupState) => (
                                    <>
                                        <Tooltip {...CustomTooltipProps} title="Importar/Exportar">
                                            <button
                                                className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                aria-label="Importar/Exportar"
                                                {...bindTrigger(popupState)}
                                            >
                                                <ImportExport fontSize="small" />
                                            </button>
                                        </Tooltip>
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
                            <Can
                                role={user.profile}
                                perform="contacts-page:deleteContact"
                                yes={() => (
                                    selectedContactIds.length > 0 ? (
                                        <Tooltip {...CustomTooltipProps} title={`Deletar (${selectedContactIds.length})`}>
                                            <button
                                                onClick={() => setConfirmDeleteManyOpen(true)}
                                                disabled={loading}
                                                className="w-10 h-10 flex items-center justify-center text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                aria-label={`Deletar ${selectedContactIds.length} contato(s)`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </Tooltip>
                                    ) : null
                                )}
                                no={() => null}
                            />
                            <Tooltip {...CustomTooltipProps} title="Novo Contato">
                                <button
                                    onClick={handleOpenContactModal}
                                    className="w-10 h-10 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label="Novo Contato"
                                >
                                    <UserPlus className="w-6 h-6" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Linha 2: Busca sozinha */}
                    <div className="relative w-full">
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

                {/* Barra de Ações e Filtros - Desktop (1 linha) */}
                <div className="hidden min-[1200px]:flex items-center gap-3 flex-nowrap">
                    {/* Filtros e Busca (Esquerda) */}
                    <div className="w-full flex items-center gap-2 flex-1 min-w-0 justify-start">
                        <div className="relative">
                            <TagsFilter onFiltered={handleSelectedTags} />
                        </div>

                        {/* Busca com largura limitada */}
                        <div className="relative flex-1 ">
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
                    <div className="w-full md:w-auto flex flex-row gap-2 flex-none whitespace-nowrap items-center">
                        <PopupState variant="popover" popupId="contacts-import-export-menu">
                            {(popupState) => (
                                <>
                                    <Tooltip {...CustomTooltipProps} title="Importar/Exportar">
                                        <button
                                            className="w-10 h-10 flex items-center justify-center text-gray-700 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            aria-label="Importar/Exportar"
                                            {...bindTrigger(popupState)}
                                        >
                                            <ImportExport fontSize="small" />
                                        </button>
                                    </Tooltip>
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

                        <Can
                            role={user.profile}
                            perform="contacts-page:deleteContact"
                            yes={() => (
                                selectedContactIds.length > 0 ? (
                                    <Tooltip {...CustomTooltipProps} title={`Deletar (${selectedContactIds.length})`}>
                                        <button
                                            onClick={() => setConfirmDeleteManyOpen(true)}
                                            disabled={loading}
                                            className="w-10 h-10 flex items-center justify-center text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            aria-label={`Deletar ${selectedContactIds.length} contato(s)`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </Tooltip>
                                ) : null
                            )}
                            no={() => null}
                        />

                        <Tooltip {...CustomTooltipProps} title="Novo Contato">
                            <button
                                onClick={handleOpenContactModal}
                                className="w-10 h-10 flex items-center justify-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Novo Contato"
                            >
                                <UserPlus className="w-6 h-6" />
                            </button>
                        </Tooltip>
                    </div>
                </div>
                {/* Tabela de Contatos (Desktop) */}
                <div className="hidden min-[1200px]:block bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-hidden">
                        <table className="w-full table-fixed text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="w-[48px] p-4">
                                        <input type="checkbox"
                                            checked={isSelectAllChecked}
                                            onChange={handleSelectAllContacts}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                    </th>
                                    <th scope="col" className="pl-0 pr-3 py-3 w-[240px] lg:w-[300px]">Nome</th>
                                    <th scope="col" className="pl-3 pr-3 py-3 w-[140px]">WhatsApp</th>
                                    <th scope="col" className="hidden lg:table-cell pl-1 pr-1 py-3 w-[120px]">Email</th>
                                    <th scope="col" className="pl-3 pr-3 py-3 w-[120px]">Cidade/UF</th>
                                    <th scope="col" className="pl-3 pr-3 py-3 text-center w-[100px]">Tags</th>
                                    <th scope="col" className="pl-3 pr-3 py-3 text-center w-[110px]">Status</th>
                                    <th scope="col" className="pl-3 pr-3 py-3 text-center w-[120px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.filter(contact => !contact.isGroup).map((contact) => (
                                    <tr key={contact.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="w-[48px] p-4">
                                            <input type="checkbox"
                                                checked={selectedContactIds.includes(contact.id)}
                                                onChange={handleToggleSelectContact(contact.id)}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                        </td>
                                        <td className="pl-0 pr-3 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center gap-3 w-[240px] lg:w-[300px] max-w-[240px] lg:max-w-[300px] overflow-hidden text-ellipsis">
                                            <Tooltip {...CustomTooltipProps} title={contact.name}>
                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 flex-shrink-0 overflow-hidden">
                                                    <ContactAvatar 
                                                        contact={contact}
                                                        style={{ width: "40px", height: "40px" }}
                                                    />
                                                </div>
                                            </Tooltip>
                                            <Tooltip {...CustomTooltipProps} title={contact.name}>
                                                <span className="truncate flex-1 min-w-0">
                                                    {contact.name}
                                                </span>
                                            </Tooltip>
                                        </td>
                                        <td className="pl-3 pr-3 py-3 whitespace-nowrap w-[140px]">
                                            {formatPhoneNumber(contact.number)}
                                        </td>
                                        <td className="hidden lg:table-cell pl-1 pr-1 py-3 w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
                                            <Tooltip {...CustomTooltipProps} title={contact.email}>
                                                <span className="truncate block max-w-full text-xs">{contact.email}</span>
                                            </Tooltip>
                                        </td>
                                        <td className="pl-3 pr-3 py-3 max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
                                            <Tooltip {...CustomTooltipProps} title={contact.city}>
                                                <span className="truncate">{contact.city}</span>
                                            </Tooltip>
                                        </td>
                                        <td className=" pl-3 pr-3 py-3 w-[100px]">
                                            <div className="flex items-center gap-1">
                                                {contact.tags && contact.tags.slice(0, 4).map((tag) => (
                                                    <Tooltip {...CustomTooltipProps} title={tag.name} key={tag.id}>
                                                        <span
                                                            className="inline-block w-[10px] h-[10px] rounded-full"
                                                            style={{ backgroundColor: tag.color || '#9CA3AF' }}
                                                        ></span>
                                                    </Tooltip>
                                                ))}
                                                {contact.tags && contact.tags.length > 4 && (
                                                    <Tooltip {...CustomTooltipProps} title={contact.tags.slice(4).map(t => t.name).join(", ")}>
                                                        <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white rounded-full bg-gray-400 dark:bg-gray-600 select-none">
                                                            +{contact.tags.length - 4}
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                        <td className="pl-3 pr-3 py-3 text-center w-[110px]">
                                            <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                                                contact.situation === 'Ativo' 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                    : contact.situation === 'Inativo' 
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                        : contact.situation === 'Suspenso'
                                                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                            : 'bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                            }`}>
                                                {contact.situation || (contact.active ? 'Ativo' : 'Inativo')}
                                            </span>
                                        </td>
                                        <td className="pl-3 pr-3 py-3 text-center w-[120px]">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Tooltip {...CustomTooltipProps} title="Enviar mensagem pelo WhatsApp">
                                                    <button onClick={() => { setContactTicket(contact); setNewTicketModalOpen(true); }} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">
                                                        <WhatsApp className="w-4 h-4" />
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
                            Página {" "}
                            <span className="font-semibold text-gray-900 dark:text-white">{pageNumber}</span>
                            {" "} de {" "}
                            <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
                            {" "} • {" "}
                            <span className="font-semibold text-gray-900 dark:text-white">{totalContacts}</span> contatos
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
                                <option value={500}>500</option>
                                <option value={1000}>1000</option>
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
                <div className="min-[1200px]:hidden flex flex-col gap-1.5 mt-3 w-full max-w-md mx-auto">
                    {contacts.filter(contact => !contact.isGroup).map((contact) => (
                        <div key={contact.id} className="w-full bg-white dark:bg-gray-800 shadow rounded-lg p-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 overflow-hidden flex-shrink-0">
                                <ContactAvatar 
                                    contact={contact}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate" title={contact.name}>
                                    {truncateText(contact.name, 20)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate" title={contact.email}>
                                    {contact.email}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {formatPhoneNumber(contact.number)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
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
