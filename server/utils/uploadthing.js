const { createUploadthing } = require("uploadthing/express");
const f = createUploadthing();

const uploadRouter = {
  conversationUploader: f({
    image: {
      maxFileSize: "32MB",
      maxFileCount: 32,
    },
    pdf: {
      maxFileSize: "128MB",
      maxFileCount: 10,
    },
    video: {
      maxFileSize: "128MB",
      maxFileCount: 10,
    },
    audio: {
      maxFileSize: "128MB",
      maxFileCount: 10,
    },
    text: {
      maxFileSize: "128MB",
      maxFileCount: 10,
    },
    blob: {
      maxFileSize: "128MB",
      maxFileCount: 10,
    },
  }).onUploadComplete(({ file }) => {
    return {
      success: true,
      url: file.ufsUrl,
      fileHash: file.fileHash,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  }),

  avatarUploader: f({
    image: {
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
  }).onUploadComplete(({ file }) => {
    return {
      success: true,
      url: file.ufsUrl,
      fileHash: file.fileHash,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  }),
};

module.exports = { uploadRouter };
