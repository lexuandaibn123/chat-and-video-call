const mongoose = require("mongoose");
/**
 * @openapi
 * components:
 *   schemas:
 *     FileMetaData:
 *       type: object
 *       properties:
 *         fileName:
 *           type: string
 *           description: Name of the file
 *           example: example.jpg
 *         fileHash:
 *           type: string
 *           description: Hash of the file content
 *           example: abc123def456
 *         mimeType:
 *           type: string
 *           description: MIME type of the file
 *           example: image/jpeg
 *         size:
 *           type: number
 *           description: Size of the file in bytes
 *           example: 1024
 *       required:
 *         - fileName
 *         - fileHash
 *         - mimeType
 *         - size
 *     ImagePart:
 *       type: object
 *       properties:
 *         metadata:
 *           oneOf:
 *             - $ref: '#/components/schemas/FileMetaData'
 *             - type: 'null'
 *           description: Metadata of the image file, can be null
 *         data:
 *           type: string
 *           description: The image data, either a URL or base64 encoded string
 *           example: https://example.com/image.jpg
 *         type:
 *           type: string
 *           enum: ["image"]
 *           description: Type of the part, always "image"
 *           example: image
 *       required:
 *         - data
 *         - type
 *     FilePart:
 *       type: object
 *       properties:
 *         metadata:
 *           oneOf:
 *             - $ref: '#/components/schemas/FileMetaData'
 *             - type: 'null'
 *           description: Metadata of the file, can be null
 *         data:
 *           type: string
 *           description: The file data, either a URL or base64 encoded string
 *           example: https://example.com/file.pdf
 *         type:
 *           type: string
 *           enum: ["file"]
 *           description: Type of the part, always "file"
 *           example: file
 *       required:
 *         - data
 *         - type
 *     TextPart:
 *       type: object
 *       properties:
 *         data:
 *           type: string
 *           description: The text content
 *           example: Hello, world!
 *         type:
 *           type: string
 *           enum: ["text"]
 *           description: Type of the part, always "text"
 *           example: text
 *       required:
 *         - data
 *         - type
 */
const FileMetaDataSchema = new mongoose.Schema(
  {
    fileName: String,
    fileHash: String,
    mimeType: String,
    size: Number,
  },
  { _id: false }
);

// Image
const ImagePartSchema = new mongoose.Schema(
  {
    metadata: { type: FileMetaDataSchema, default: null },
    data: { type: String }, // url or base64
    type: { type: String, enum: ["image"], default: "image" },
  },
  { _id: false }
);

// File
const FilePartSchema = new mongoose.Schema(
  {
    metadata: { type: FileMetaDataSchema, default: null },
    data: { type: String }, // url or base64
    type: { type: String, enum: ["file"], default: "file" },
  },
  { _id: false }
);

// Text
const TextPartSchema = new mongoose.Schema(
  {
    data: { type: String },
    type: { type: String, enum: ["text"], default: "text" },
  },
  { _id: false }
);

module.exports = {
  ImagePartSchema,
  FilePartSchema,
  TextPartSchema,
};