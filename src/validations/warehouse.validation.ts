// The warehouse takes exactly the same input shapes as inventory, so it
// validates with the same rules. Re-exported (not copied) so a change to
// one applies to both.
export {
  createItemValidation,
  updateItemValidation,
  adjustStockValidation,
  listItemsValidation,
  listMovementsValidation,
} from "./inventory.validation";
