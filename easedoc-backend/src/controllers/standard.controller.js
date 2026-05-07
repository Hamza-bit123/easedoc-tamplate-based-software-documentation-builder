import { getStandardsByTypeService } from "../services/standard.service.js";

export const getStandardsByTypeController = async (req, res) => {
  try {
    const typeId = Number(req.params.typeId);

    if (!typeId) {
      return res.status(400).json({ message: "Invalid type id" });
    }
    const standards = await getStandardsByTypeService(typeId);

    res.json(standards || []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
