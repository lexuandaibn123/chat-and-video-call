const mongoose = require("mongoose");
const { ImagePartSchema, FilePartSchema, TextPartSchema } = require("./part");
/**
 * @openapi
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the post
 *           example: 507f1f77bcf86cd799439011
 *         poster:
 *           type: object
 *           $ref: '#/components/schemas/User'
 *         content:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/TextPart'
 *               - $ref: '#/components/schemas/ImagePart'
 *               - $ref: '#/components/schemas/FilePart'
 *           description: The content of the post, which can be a mix of text, images, and files
 *         isDeleted:
 *           type: boolean
 *           description: Whether the post has been deleted
 *           default: false
 *           example: false
 *         isEdited:
 *           type: boolean
 *           description: Whether the post has been edited
 *           default: false
 *           example: false
 *         reacts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               react:
 *                 type: string
 *                 description: ID of the reaction
 *                 example: 507f1f77bcf86cd799439013
 *           description: List of reactions to the post
 *         comments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *                 description: ID of the comment
 *                 example: 507f1f77bcf86cd799439014
 *           description: List of comments on the post
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the post was created
 *           example: 2023-01-01T00:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the post was last updated
 *           example: 2023-01-01T00:00:00Z
 *       required:
 *         - poster
 *         - content
 */

const ContentSchema = new mongoose.Schema(
  {},
  { discriminatorKey: "contentType", _id: false }
);

ContentSchema.discriminator("TextPart", TextPartSchema);
ContentSchema.discriminator("ImagePart", ImagePartSchema);
ContentSchema.discriminator("FilePart", FilePartSchema);

const PostSchema = new mongoose.Schema(
  {
    poster: { type: mongoose.Types.ObjectId, ref: "User" },
    content: [ContentSchema],
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    reacts: [
      {
        react: { type: mongoose.Types.ObjectId, ref: "React" },
      },
    ],
    comments: [
      {
        comment: { type: mongoose.Types.ObjectId, ref: "Comment" },
      },
    ],
  },
  {
    timestamps: { createdAt: "datetime_created", updatedAt: "last_updated" },
  }
);

/*
content like: [
    { contentType: "TextPart", data: "Đây là nội dung văn bản." },
    { contentType: "ImagePart", url: "http://example.com/image.jpg", caption: "Hình ảnh mẫu" },
    { contentType: "FilePart", url: "http://example.com/file.pdf", fileName: "tai_lieu.pdf", fileType: "application/pdf" },
    { contentType: "TextPart", data: "Một đoạn văn bản khác." }
  ]

  contentType: "TextPart" | "ImagePart" | "FilePart"
*/

module.exports = mongoose.model("Post", PostSchema);
