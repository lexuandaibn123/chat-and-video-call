const { createUploadthing } = require("uploadthing/express");
const f = createUploadthing();

const uploadRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
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
  })
    // .middleware((req, res) => {
    //   try {
    //     const userInfo = req.session.userInfo;
    //     console.log("userInfo: ", userInfo);
    //     if (!userInfo) return res.status(401).json({ error: "Unauthorized" });
    //     return { userInfo };
    //   } catch (error) {
    //     console.error(error);
    //     return res.status(500).json({ error: "Internal server error" });
    //   }
    // })
    .onUploadComplete(({ file }) => {
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
