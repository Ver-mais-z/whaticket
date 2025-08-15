import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  CircularProgress,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Typography,
  InputAdornment
} from "@material-ui/core";

import Autocomplete from "@material-ui/lab/Autocomplete";

import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: "100%",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
  },
  chip: {
    margin: 2,
  },
}));

const AddFilteredContactsModal = ({ open, onClose, contactListId, reload }) => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [cities, setCities] = useState([]);
  const [situations, setSituations] = useState([]);
  const [representativeCodes, setRepresentativeCodes] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    if (open) {
      loadChannels();
      loadCities();
      loadSituations();
      loadRepresentativeCodes();
      loadTags();
    }
  }, [open]);

  const loadChannels = async () => {
    try {
      const { data } = await api.get("/contacts", {
        params: { pageNumber: 1 },
      });
      const uniqueChannels = [...new Set(data.contacts.map(contact => contact.channel).filter(Boolean))];
      setChannels(uniqueChannels);
    } catch (err) {
      toastError(err);
    }
  };

  const loadCities = async () => {
    try {
      const { data } = await api.get("/contacts", {
        params: { pageNumber: 1 },
      });
      const uniqueCities = [...new Set(data.contacts.map(contact => contact.city).filter(Boolean))];
      setCities(uniqueCities);
    } catch (err) {
      toastError(err);
    }
  };

  const loadSituations = async () => {
    try {
      const { data } = await api.get("/contacts", {
        params: { pageNumber: 1 },
      });
      const uniqueSituations = [...new Set(data.contacts.map(contact => contact.situation).filter(Boolean))];
      setSituations(uniqueSituations);
    } catch (err) {
      toastError(err);
    }
  };

  const loadRepresentativeCodes = async () => {
    try {
      const { data } = await api.get("/contacts", {
        params: { pageNumber: 1 },
      });
      const uniqueCodes = [...new Set(data.contacts.map(contact => contact.representativeCode).filter(Boolean))];
      setRepresentativeCodes(uniqueCodes);
    } catch (err) {
      toastError(err);
    }
  };

  const loadTags = async () => {
    try {
      const { data } = await api.get("/tags");
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.tags) ? data.tags : []);
      setTags(list);
    } catch (err) {
      toastError(err);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedTags([]);
  };

  const handleAddFilteredContacts = async (values) => {
    setLoading(true);
    try {
      // Preparar os filtros para enviar ao backend
      const filters = {
        ...values,
        channel: values.channel ? values.channel : null,
        representativeCode: values.representativeCode ? values.representativeCode : null,
        city: values.city ? values.city : null,
        situation: values.situation ? values.situation : null,
        tags: selectedTags.map(tag => tag.id)
      };

      // Tratar minCreditLimit e maxCreditLimit para garantir que sejam números ou strings numéricas
      if (filters.minCreditLimit) {
        filters.minCreditLimit = String(filters.minCreditLimit).replace(/R\$?\s?/gi, '').replace(/\./g, '').replace(/,/g, '.');
      }
      if (filters.maxCreditLimit) {
        filters.maxCreditLimit = String(filters.maxCreditLimit).replace(/R\$?\s?/gi, '').replace(/\./g, '').replace(/,/g, '.');
      }

      // Remover filtros vazios
      Object.keys(filters).forEach(key => {
        if (filters[key] === "" || filters[key] === null || filters[key] === undefined ||
          (Array.isArray(filters[key]) && filters[key].length === 0)) {
          delete filters[key];
        }
      });

      try {
        const { data } = await api.post(
          `/contact-list-items/${contactListId}/add-filtered-contacts`,
          { filters }
        );

        toast.success(
          i18n.t("contactListItems.toasts.addedSuccess", {
            count: data.added,
          })
        );

        if (data.duplicated > 0) {
          toast.warning(
            i18n.t("contactListItems.toasts.duplicated", {
              count: data.duplicated,
            })
          );
        }

        if (data.errors > 0) {
          toast.error(
            i18n.t("contactListItems.toasts.addedError", {
              count: data.errors,
            })
          );
        }

        handleClose();
        reload();
      } catch (err) {
        console.error("Erro ao adicionar contatos filtrados:", err);
        
        // Mensagens de erro mais específicas
        if (err.response && err.response.data && err.response.data.error) {
          const errorMsg = err.response.data.error;
          
          if (errorMsg.includes("limite de crédito")) {
            toast.error(i18n.t("contactListItems.toasts.creditLimitError"));
          } else if (errorMsg.includes("mês/ano")) {
            toast.error(i18n.t("contactListItems.toasts.monthYearError"));
          } else if (errorMsg.includes("tags")) {
            toast.error(i18n.t("contactListItems.toasts.tagsError"));
          } else {
            toastError(err);
          }
        } else {
          toastError(err);
        }
      }
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        {i18n.t("contactListItems.dialog.filter")}
      </DialogTitle>
      <Formik
        initialValues={{
          channel: [],
          representativeCode: [],
          city: [],
          situation: [],
          monthYear: "",
          minCreditLimit: "",
          maxCreditLimit: "",
        }}
        enableReinitialize={true}
        onSubmit={(values, actions) => {
          handleAddFilteredContacts(values);
          actions.setSubmitting(false);
        }}
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form>
            <DialogContent dividers style={{ maxHeight: '400px' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Field name="channel">
                    {({ field, form }) => (
                      <Autocomplete
                        multiple
                        options={channels}
                        getOptionLabel={(option) => option}
                        value={field.value || []}
                        onChange={(event, value) => form.setFieldValue(field.name, value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label={i18n.t("contactListItems.filterDialog.channel")}
                            placeholder={i18n.t("contactListItems.filterDialog.channel")}
                            fullWidth
                            margin="dense"
                          />
                        )}
                      />
                    )}
                  </Field>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Field name="representativeCode">
                    {({ field, form }) => (
                      <Autocomplete
                        multiple
                        options={representativeCodes}
                        getOptionLabel={(option) => option}
                        value={field.value || []}
                        onChange={(event, value) => form.setFieldValue(field.name, value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label={i18n.t("contactListItems.filterDialog.representativeCode")}
                            placeholder={i18n.t("contactListItems.filterDialog.representativeCode")}
                            fullWidth
                            margin="dense"
                          />
                        )}
                      />
                    )}
                  </Field>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Field name="city">
                    {({ field, form }) => (
                      <Autocomplete
                        multiple
                        options={cities}
                        getOptionLabel={(option) => option}
                        value={field.value || []}
                        onChange={(event, value) => form.setFieldValue(field.name, value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label={i18n.t("contactListItems.filterDialog.city")}
                            placeholder={i18n.t("contactListItems.filterDialog.city")}
                            fullWidth
                            margin="dense"
                          />
                        )}
                      />
                    )}
                  </Field>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Field name="situation">
                    {({ field, form }) => (
                      <Autocomplete
                        multiple
                        options={situations}
                        getOptionLabel={(option) => option}
                        value={field.value || []}
                        onChange={(event, value) => form.setFieldValue(field.name, value)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label={i18n.t("contactListItems.filterDialog.situation")}
                            placeholder={i18n.t("contactListItems.filterDialog.situation")}
                            fullWidth
                            margin="dense"
                          />
                        )}
                      />
                    )}
                  </Field>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    label={i18n.t("contactListItems.filterDialog.monthYear")}
                    name="monthYear"
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    placeholder="2023-01"
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Field
                    as={TextField}
                    label={i18n.t("contactListItems.filterDialog.minCreditLimit")}
                    name="minCreditLimit"
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Field
                    as={TextField}
                    label={i18n.t("contactListItems.filterDialog.maxCreditLimit")}
                    name="maxCreditLimit"
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    id="tags"
                    options={tags}
                    getOptionLabel={(option) => option.name}
                    value={selectedTags}
                    onChange={(e, newValue) => {
                      setSelectedTags(newValue);
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option.name}
                          {...getTagProps({ index })}
                          style={{ backgroundColor: option.color, color: "#fff" }}
                          className={classes.chip}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label={i18n.t("contactListItems.filterDialog.tags")}
                        placeholder={i18n.t("contactListItems.filterDialog.tags")}
                        fullWidth
                        margin="dense"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleClose}
                color="secondary"
                disabled={loading}
                variant="outlined"
              >
                {i18n.t("contactListItems.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={loading}
                variant="contained"
                className={classes.btnWrapper}
              >
                {i18n.t("contactListItems.buttons.filter")}
                {loading && (
                  <CircularProgress
                    size={24}
                    className={classes.buttonProgress}
                  />
                )}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default AddFilteredContactsModal;
