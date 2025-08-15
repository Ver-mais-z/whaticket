import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";

interface Data {
  id: number | string;
  name?: string;
  savedFilter?: any | null;
}

const UpdateService = async (data: Data): Promise<ContactList> => {
  const { id, name, savedFilter } = data;

  const record = await ContactList.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_CONTACTLIST_FOUND", 404);
  }

  const updates: any = {};
  if (typeof name !== "undefined") updates.name = name;
  if (typeof savedFilter !== "undefined") updates.savedFilter = savedFilter;

  await record.update(updates);

  return record;
};

export default UpdateService;
