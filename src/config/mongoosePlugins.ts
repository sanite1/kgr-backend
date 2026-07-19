import mongoose from "mongoose";

// Global safety net against stale documents.
//
// On save, Mongoose normally re-validates the WHOLE document. That means
// adding a new required field breaks saving any document created before
// the field existed (a status change on an old receipt would fail on a
// missing battery field, etc.). validateModifiedOnly makes save validate
// ONLY the paths that actually changed, so updating an old document never
// trips over fields it predates.
//
// New documents still set all their fields (so those paths are modified
// and fully validated), and every create endpoint is Joi-validated at the
// boundary regardless - so this relaxes nothing that matters on creation.
//
// Registered here as a global plugin; must load before any model compiles.
mongoose.plugin((schema) => {
  schema.set("validateModifiedOnly", true);
});
