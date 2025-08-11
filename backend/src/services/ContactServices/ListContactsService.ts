import { Sequelize, fn, col, where, Op, Filterable } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ContactTag from "../../models/ContactTag";

import { intersection } from "lodash";
import Tag from "../../models/Tag";
import removeAccents from "remove-accents";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
  tagsIds?: number[];
  isGroup?: string;
  userId?: number;
  profile?: string;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
                                     searchParam = "",
                                     pageNumber = "1",
                                     companyId,
                                     tagsIds,
                                     isGroup,
                                     userId,
                                     profile
                                   }: Request): Promise<Response> => {
  let whereCondition: Filterable["where"] = {};

  if (profile !== 'admin') {
    const userTickets = await Ticket.findAll({
      where: { userId },
      attributes: ["contactId"],
      group: ["contactId"]
    });

    const contactIds = userTickets.map(t => t.contactId);

    whereCondition.id = {
      [Op.in]: contactIds
    };
  }

  if (searchParam) {
    const sanitizedSearchParam = removeAccents(searchParam.toLocaleLowerCase().trim());
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          name: where(
            fn("LOWER", fn("unaccent", col("Contact.name"))),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { number: { [Op.like]: `%${sanitizedSearchParam}%` } },
        {
          cpfCnpj: where(
            fn("LOWER", fn("unaccent", col("Contact.cpfCnpj"))),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        {
          representativeCode: where(
            fn("LOWER", fn("unaccent", col("Contact.representativeCode"))),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        {
          fantasyName: where(
            fn("LOWER", fn("unaccent", col("Contact.fantasyName"))),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        {
          city: where(
            fn("LOWER", fn("unaccent", col("Contact.city"))),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        }
      ]
    };
  }

  whereCondition = {
    ...whereCondition,
    companyId
  };

  if (Array.isArray(tagsIds) && tagsIds.length > 0) {
    const contactTagFilter: any[] | null = [];
    const contactTags = await ContactTag.findAll({
      where: { tagId: { [Op.in]: tagsIds } }
    });
    if (contactTags) {
      contactTagFilter.push(contactTags.map(t => t.contactId));
    }

    const contactTagsIntersection: number[] = intersection(...contactTagFilter);

    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: contactTagsIntersection
      }
    };
  }

  if (isGroup === "false") {
    whereCondition = {
      ...whereCondition,
      isGroup: false
    }
  }

  const limit = 100;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: whereCondition,
    attributes: [
      "id",
      "name",
      "number",
      "email",
      "isGroup",
      "urlPicture",
      "active",
      "companyId",
      "channel",
      // Adiciona novos campos aos atributos
      "cpfCnpj",
      "representativeCode",
      "city",
      "instagram",
      "situation",
      "fantasyName",
      "foundationDate",
      "creditLimit"
    ],
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"]
      },
    ],
    offset,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export default ListContactsService;
