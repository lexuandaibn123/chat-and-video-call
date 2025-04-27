// src/api/upload.js

// Simulate uploading a file and returning its URL and metadata
const mockUploadFileApi = async (file) => {
    console.log(`Mock Uploading file: ${file.name} (${file.size} bytes, ${file.type})`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success response with a dummy URL and metadata
    const uploadedFileDetails = {
        data: `https://mock.api/uploads/${Date.now()}/${file.name}`, // Mock URL
        metadata: {
            fileName: file.name,
            size: file.size,
            mimeType: file.type,
            // Add other metadata if needed
        },
        type: file.type.startsWith('image/') ? 'image' : 'file', // Determine type based on mime type
    };

    console.log("Mock Upload successful:", uploadedFileDetails);

    return {
        success: true,
        data: uploadedFileDetails,
    };

    // Simulate upload failure (uncomment to test failure state)
    // console.error("Mock Upload failed for:", file.name);
    // return {
    //     success: false,
    //     error: 'Mock upload failed',
    //     message: 'Failed to upload file.',
    // };
};

export { mockUploadFileApi };