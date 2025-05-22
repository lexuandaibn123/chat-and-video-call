import { getUserDetailsApi } from "../api/users";
// services/chatService.js

// Import các API cần thiết (đảm bảo các hàm API đã được định nghĩa ở đâu đó và import vào đây nếu cần,
// hoặc chúng ta sẽ gọi chúng từ component và truyền dữ liệu thô vào service để xử lý)
// Hiện tại, tôi giả định bạn sẽ gọi API trong component và truyền dữ liệu thô vào service để xử lý.

// Hàm trợ giúp xử lý ID người dùng nhất quán (vì nó có thể là object._id hoặc string)
const getProcessedUserId = (userData) => {
    if (!userData) return null;
    if (typeof userData === 'object' && userData._id) {
        return String(userData._id).trim();
    }
    if (typeof userData === 'string') {
        return String(userData).trim();
    }
    return null;
};

const processSenderData = (rawSenderData, currentUserId) => {
    // Sử dụng helper chung để lấy ID đã chuẩn hóa
    const id = getProcessedUserId(rawSenderData);

    // Lấy tên người gửi: nếu rawSenderData là object và có fullName, lấy fullName.
    // Nếu không có fullName (rawSenderData là chuỗi ID hoặc object không có fullName),
    // kiểm tra xem ID đã chuẩn hóa có phải currentUserId không để hiển thị 'You',
    // nếu không thì hiển thị 'Unknown User'.
    const name = rawSenderData?.fullName || (id === currentUserId ? 'You' : 'Unknown User');

    // Lấy avatar người gửi: nếu rawSenderData là object và có avatar, lấy avatar.
    // Nếu không, trả về null.
    const avatar = rawSenderData?.avatar || null;

    return {
        id: id,
        name: name,
        avatar: avatar
    };
};

// Hàm xử lý danh sách phòng chat thô từ API
export const processRawRooms = (rawRooms, currentUserId) => {
    if (!rawRooms || !Array.isArray(rawRooms)) {
        return [];
    }

    const conversationsData = rawRooms.map(room => {
        const roomId = room._id;
        const isGroup = room.isGroup;
        const latestMessage = room.latestMessage;

        let conversationName = room.name;
        let conversationAvatar = room.avatar || null;
        let conversationType = isGroup ? 'group' : 'friend';

        // Process members to ensure IDs are trimmed strings
        const processedMembers = room.members?.map(m => ({
            ...m,
            id: getProcessedUserId(m.id), // Sử dụng helper để xử lý ID
            leftAt: m.leftAt // Giữ nguyên trường leftAt
        })) || [];

        const activeMembers = processedMembers?.filter(m => m.leftAt === null) || [];
        let conversationStatusText = isGroup ? `${activeMembers.length} members` : 'Offline'; // Giả định mặc định là Offline cho friend

        // Logic xác định tên và avatar cho chat 1-1
        if (!isGroup && processedMembers && processedMembers.length > 0) {
            // Tìm thành viên khác mình
            const otherMember = processedMembers.find(member => member.id && member.id !== currentUserId);

            if (otherMember) {
                 // Tìm dữ liệu gốc của thành viên đó trong mảng members thô để lấy fullName, email, avatar
                 const originalOtherMemberData = room.members?.find(m => getProcessedUserId(m.id) === otherMember.id);
                 conversationName = originalOtherMemberData?.id?.fullName || originalOtherMemberData?.id?.email || 'Unknown User';
                 conversationAvatar = originalOtherMemberData?.id?.avatar || null;
            } else if (processedMembers.length === 1 && processedMembers[0].id === currentUserId) {
                 // Chat chỉ có mình (vd: Saved Messages?) - có thể lấy tên/avatar từ phòng hoặc từ thông tin của mình
                 // Dựa theo logic cũ, nếu chỉ có 1 mình và ID trùng, lấy từ room.name hoặc info của mình
                 const originalSelfMemberData = room.members?.find(m => getProcessedUserId(m.id) === currentUserId);
                 conversationName = room.name || originalSelfMemberData?.id?.fullName || 'Self Chat';
                 conversationAvatar = room.avatar || originalSelfMemberData?.id?.avatar || null;
            } else {
                // Trường hợp khác (vd: >2 thành viên nhưng không phải group? - unlikely based on isGroup flag, but fallback)
                conversationName = room.name || 'Unknown User';
                conversationAvatar = room.avatar || null;
            }
        }


        // Logic xác định leader cho group chat (sử dụng processedMembers đã có ID chuẩn)
        const leaderMembers = activeMembers?.filter(m => m.role === 'leader' && m.id) || [];
        const leaderIds = leaderMembers.map(m => m.id);


        // Format thời gian tin nhắn cuối
        const lastMessageTime = latestMessage?.datetime_created
            ? new Date(latestMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
            : (room.datetime_created ? new Date(room.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '');


        return {
            id: roomId,
            type: conversationType,
            name: conversationName || 'Unknown Conversation',
            avatar: conversationAvatar,
            lastMessage: latestMessage ?
                (latestMessage.type === 'text' ? latestMessage.content?.text?.data || '' : `[${latestMessage.type}]`)
                : '',
            time: lastMessageTime,
            createdAt: room.datetime_created,
            latestMessage: latestMessage?._id || null,
            latestMessageTimestamp: latestMessage?.datetime_created || room.datetime_created || new Date(0).toISOString(), // Sử dụng room.datetime_created nếu không có latestMessage timestamp
            unread: 0, // Unread count logic cần thêm vào sau
            status: null, // Status online/offline cần logic thêm vào sau
            statusText: conversationStatusText,
            members: room.members || [], // Giữ lại members thô nếu cần
            leaders: leaderIds,
            isGroup: isGroup,
            detailedMembers: processedMembers, // Sử dụng processedMembers cho các logic khác
        };
    });

    // Sắp xếp theo thời gian tin nhắn cuối (hoặc thời gian tạo phòng nếu không có tin nhắn cuối)
    conversationsData.sort((a, b) => {
        const dateA = new Date(a.latestMessageTimestamp || 0);
        const dateB = new Date(b.latestMessageTimestamp || 0);
        return dateB.getTime() - dateA.getTime(); // Sắp xếp giảm dần
    });

    return conversationsData;
};

// Hàm xử lý danh sách tin nhắn thô từ API
export const processRawMessages = async (rawMessages, currentUserId) => {
  if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
    return [];
  }

  // 1. Tập hợp unique senderId (chuỗi) cần fetch, loại bỏ current user
  const uniqueIdsToFetch = Array.from(
    new Set(
      rawMessages
        .map(msg => msg.senderId)
        .filter(id => id && id !== currentUserId)
    )
  );

  // 2. Fetch song song, lưu vào cache
  const userCache = {};
  await Promise.all(
    uniqueIdsToFetch.map(async userId => {
      try {
        const user = await getUserDetailsApi(userId);
        userCache[userId] = {
          name: user.fullName || 'Unknown User',
          avatar: user.avatar || null
        };
      } catch (err) {
        console.error(`Error fetching details for ${userId}:`, err);
        userCache[userId] = { name: 'Unknown User', avatar: null };
      }
    })
  );

  // 3. Map từng message
  const formatted = rawMessages.map(msg => {
    const senderId = msg.senderId || null;
    let senderName = 'Unknown User';
    let senderAvatar = null;

    if (senderId === currentUserId) {
      senderName = 'You';
    } else if (userCache[senderId]) {
      senderName = userCache[senderId].name;
      senderAvatar = userCache[senderId].avatar;
    }

    // Format thời gian
    let timeLabel = 'Unknown time';
    if (msg.datetime_created) {
      const dt = new Date(msg.datetime_created);
      if (!isNaN(dt)) {
        timeLabel = dt
          .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
          .toLowerCase();
      }
    }

    return {
      id: msg._id || null,
      type: msg.type || 'text',
      content: msg.content && typeof msg.content === 'object' ? msg.content : {},
      time: timeLabel,
      createdAt: msg.datetime_created || null,
      lastUpdated: msg.last_updated || msg.datetime_created || null,
      isEdited: msg.isEdited || false,
      isDeleted: msg.isDeleted || false,
      senderId,
      senderName,
      senderAvatar,
      replyToMessageId: msg.replyToMessageId || null,
      conversationId: msg.conversationId || null,
      status: msg.status || 'sent',
    };
  });

  // 4. Đảo ngược để message mới nhất ở cuối
  return formatted.reverse();
};


// Hàm tạo tin nhắn text lạc quan (optimistic update)
export const createOptimisticTextMessage = (tempId, text, currentUserId, user) => {
    return {
        id: tempId,
        sender: 'self', // Dùng cho CSS
        type: 'text',
        content: { text: { type: 'text', data: text } }, // Cấu trúc content
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
        createdAt: new Date().toISOString(),
        status: 'sending', // Trạng thái gửi
        isEdited: false,
        isDeleted: false,
        senderId: currentUserId, // ID người gửi
        senderName: user?.fullName || 'You', // Tên người gửi (lấy từ auth context)
        senderAvatar: user?.avatar || null, // Avatar người gửi (lấy từ auth context)
    };
};

// Hàm tạo payload gửi tin nhắn text cho API
export const buildTextMessagePayload = (conversationId, text, replyToMessageId = null) => {
    return {
        conversationId: conversationId,
        type: 'text',
        data: { data: text, type: 'text' },
        replyToMessageId: replyToMessageId, // TODO: Cần thêm logic xử lý reply
    };
};

// localPreviewUrl: URL tạm thời (chỉ dùng cho ảnh)
export const createOptimisticFileMessage = (tempId, file, currentUserId, user, localPreviewUrl = null) => {
    // Xác định loại file dựa trên MIME type gốc
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';

    // Tạo object metadata theo FileMetaDataSchema từ File object gốc
    const optimisticMetadata = {
         fileName: file.name,
         // fileHash: null, // Chưa có hash lúc optimistic
         mimeType: file.type,
         size: file.size,
    };

    let optimisticContent; // Cấu trúc content lạc quan

    if (fileType === 'image') {
        // Cấu trúc content image mong muốn: { image: [{ metadata: {...}, data: url, type: 'image' }] }
        optimisticContent = {
            image: [{ // Mảng chứa các image parts
                metadata: optimisticMetadata, // Sử dụng object metadata đã tạo
                data: localPreviewUrl, // Dùng localPreviewUrl làm URL tạm thời cho trường 'data'
                type: 'image', // Loại part là 'image'
            }]
        };
    } else { // fileType === 'file'
        // Cấu trúc content file mong muốn: { file: { metadata: {...}, data: url, type: 'file' } }
        optimisticContent = {
            file: { // Object chứa thông tin file
                metadata: optimisticMetadata, // Sử dụng object metadata đã tạo
                data: null, // URL tạm thời cho file thường là null
                type: 'file', // Loại part là 'file'
            }
        };
    }

    return {
        id: tempId,
        sender: 'self', // Dùng cho CSS
        type: fileType, // 'image' or 'file'
        content: optimisticContent, // Sử dụng cấu trúc content đã chuẩn hóa
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
        createdAt: new Date().toISOString(),
        status: 'uploading', // Trạng thái ban đầu
        isEdited: false,
        isDeleted: false,
        senderId: currentUserId,
        senderName: user?.fullName || 'You',
        senderAvatar: user?.avatar || null,
    };
};

export const buildFileMessagePayload = (conversationId, fileType, uploadedFileDetails, replyToMessageId = null, tempId) => {

    // Lấy dữ liệu chính xác đã được xử lý và trả về từ backend Uploadthing
    const serverFileDetails = uploadedFileDetails.serverData;

    // Tạo object metadata theo FileMetaDataSchema
    const metadata = {
        fileName: serverFileDetails.name,
        fileHash: serverFileDetails.fileHash,
        mimeType: serverFileDetails.type, // Uploadthing type là mimeType
        size: serverFileDetails.size,
    };

    let dataForBackend; // <-- Đây sẽ là giá trị của trường 'data' ở level ngoài

    if (fileType === 'image') {
         // Backend cần MẢNG các ImagePartSchema objects cho trường 'data' (level ngoài)
         // ImagePartSchema: { metadata: FileMetaDataSchema, data: url, type: "image" }
         dataForBackend = [{ // Bọc trong mảng
             metadata: metadata, // Sử dụng object metadata đã tạo
             data: serverFileDetails.url, // URL là trường 'data' trong schema
             type: 'image', // Loại part là 'image'
             // Thêm các trường khác nếu ImagePartSchema yêu cầu
         }];
    } else if (fileType === 'file') {
         // Backend cần OBJECT FilePartSchema cho trường 'data' (level ngoài)
         // FilePartSchema (dựa trên cấu trúc image): { metadata: FileMetaDataSchema, data: url, type: "file" }
         dataForBackend = { // Không bọc trong mảng
             metadata: metadata, // Sử dụng object metadata đã tạo
             data: serverFileDetails.url, // URL là trường 'data' trong schema
             type: 'file', // Loại part là 'file'
             // Thêm các trường khác nếu FilePartSchema yêu cầu
         };
    } else {
        console.error("Unsupported file type for message payload:", fileType);
        // Fallback: gửi như file object hoặc throw error
        dataForBackend = { // Gửi cấu trúc file
            metadata: metadata,
            data: serverFileDetails.url,
            type: 'file',
        };
    }

    // Xây dựng cấu trúc payload cuối cùng
    return {
        conversationId: conversationId,
        type: fileType, // 'image' or 'file' (outer type)
        data: dataForBackend, // <--- dataForBackend là mảng hoặc object TRỰC TIẾP
        replyToMessageId: replyToMessageId, // null theo mặc định nếu không truyền
        tempId: tempId,
    };
};


// Hàm cập nhật danh sách conversations sau khi có tin nhắn mới (đã gửi thành công hoặc nhận được qua socket)
export const updateConversationsListLatestMessage = (prevConversations, activeChatId, latestMessage) => {
    if (!latestMessage || !activeChatId) {
        console.warn("updateConversationsListLatestMessage: Missing latestMessage or activeChatId");
        return [...prevConversations]; // Return current list if invalid input
    }

    const updatedConversations = prevConversations.map(conv =>
        conv.id === activeChatId
            ? {
                ...conv,
                // Lấy lastMessage text hoặc placeholder
                lastMessage: latestMessage.type === 'text' ? latestMessage.content?.text?.data || '' : `[${latestMessage.type.toUpperCase()}]`,
                // Format thời gian
                time: latestMessage.datetime_created ? new Date(latestMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '',
                // Cập nhật timestamp và ID tin nhắn cuối
                latestMessageTimestamp: latestMessage.datetime_created || conv.latestMessageTimestamp, // Giữ timestamp cũ nếu latestMessage không có
                latestMessage: latestMessage._id || conv.latestMessage, // Giữ ID cũ nếu latestMessage không có ID
                // unread count logic cần thêm vào đây nếu tin nhắn đến từ người khác
            }
            : conv
    );

    // Sắp xếp lại danh sách theo timestamp mới nhất
    updatedConversations.sort((a, b) => {
        const dateA = new Date(a.latestMessageTimestamp || 0); // Dùng timestamp mới hoặc 0 nếu không có
        const dateB = new Date(b.latestMessageTimestamp || 0);
        return dateB.getTime() - dateA.getTime(); // Sắp xếp giảm dần
    });

    return updatedConversations;
};

// Hàm tìm kiếm thành viên trong danh sách thành viên chi tiết của phòng chat
export const findMemberInDetailedList = (detailedMembers, memberIdToFind) => {
    if (!detailedMembers || !Array.isArray(detailedMembers) || !memberIdToFind) {
        return null;
    }
     // Sử dụng getProcessedUserId để đảm bảo so sánh đúng
    const processedIdToFind = getProcessedUserId(memberIdToFind);
    return detailedMembers.find(member => member.id === processedIdToFind);
};

// Helper để định dạng thông tin người gửi tin nhắn từ API
// Có thể tái sử dụng logic từ processRawMessages cho tin nhắn đơn
export const formatReceivedMessage = (rawMessage, currentUserId) => {
     if (!rawMessage) return null;

     const messageSenderId = getProcessedUserId(rawMessage.senderId);
     const messageSenderName = rawMessage.senderId?.fullName || (messageSenderId === currentUserId ? 'You' : 'Unknown User');
     const messageSenderAvatar = rawMessage.senderId?.avatar || null;

     const messageTime = rawMessage.datetime_created
          ? new Date(rawMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
          : '';

     return {
          id: rawMessage._id,
          type: rawMessage.type,
          content: rawMessage.content,
          time: messageTime,
          createdAt: rawMessage.datetime_created,
          isEdited: rawMessage.isEdited || false,
          isDeleted: rawMessage.isDeleted || false,
          senderId: messageSenderId,
          senderName: messageSenderName,
          senderAvatar: messageSenderAvatar,
          status: 'sent', // Message từ API luôn là 'sent' (hoặc có thể có trạng thái khác nếu API hỗ trợ)
     };
};

// --- Các hàm xử lý State Update sau khi gọi API Settings thành công ---

// Cập nhật danh sách conversations sau khi remove member thành công
export const updateConversationsAfterMemberRemoved = (prevConvs, conversationId, userIdToRemove) => {
  return prevConvs.map((conv) => {
    if (conv.id === conversationId) {
      // Lọc bỏ thành viên có id khớp với userIdToRemove
      const updatedDetailedMembers = conv.detailedMembers.filter(
        (member) => member.id !== userIdToRemove
      );

      // Cập nhật conversation object
      return {
        ...conv,
        detailedMembers: updatedDetailedMembers, // Cập nhật danh sách chi tiết
        statusText: `${updatedDetailedMembers.length} members`, // Cập nhật số lượng thành viên hoạt động
      };
    }
    return conv; // Giữ nguyên các conversation khác
  });
};

// Cập nhật activeChat sau khi remove member thành công
export const updateActiveChatAfterMemberRemoved = (prevActiveChat, conversationId, userIdToRemove) => {
  if (!prevActiveChat || prevActiveChat.id !== conversationId) return prevActiveChat;

  // Lọc bỏ thành viên có id khớp với userIdToRemove
  const updatedDetailedMembers = prevActiveChat.detailedMembers.filter(
    (member) => member.id !== userIdToRemove
  );

  // Cập nhật activeChat object
  return {
    ...prevActiveChat,
    detailedMembers: updatedDetailedMembers, // Cập nhật danh sách chi tiết
    statusText: `${updatedDetailedMembers.length} members`, // Cập nhật số lượng thành viên hoạt động
  };
};

// Cập nhật danh sách conversations sau khi thay đổi tên nhóm thành công
export const updateConversationsAfterGroupNameChanged = (prevConvs, conversationId, newName) => {
    return prevConvs.map(conv =>
        conv.id === conversationId ? { ...conv, name: newName } : conv // Chỉ cập nhật tên nhóm
    );
};

// Cập nhật activeChat sau khi thay đổi tên nhóm thành công
export const updateActiveChatAfterGroupNameChanged = (prevActiveChat, conversationId, newName) => {
     if (!prevActiveChat || prevActiveChat.id !== conversationId) return prevActiveChat;
     return { ...prevActiveChat, name: newName }; // Chỉ cập nhật tên trong active chat
};

// Cập nhật danh sách conversations sau khi thay đổi leader thành công
export const updateConversationsAfterLeaderChanged = (prevConvs, conversationId, newLeaderId, oldLeaderId) => {
     return prevConvs.map(conv => {
         if (conv.id === conversationId) {
             // Cập nhật role trong detailedMembers
             const updatedDetailedMembers = conv.detailedMembers.map(member => {
                  if (member.id === newLeaderId) return { ...member, role: 'leader' }; // Leader mới
                   if (member.id === oldLeaderId) return { ...member, role: 'member' }; // Leader cũ trở thành member
                   return member; // Các thành viên khác giữ nguyên
              });

             return {
                 ...conv,
                 leader: newLeaderId, // Cập nhật ID leader
                 detailedMembers: updatedDetailedMembers, // Sử dụng danh sách chi tiết đã cập nhật role
             };
         }
         return conv;
     });
};

// Cập nhật activeChat sau khi thay đổi leader thành công
export const updateActiveChatAfterLeaderChanged = (prevActiveChat, conversationId, newLeaderId, oldLeaderId) => {
     if (!prevActiveChat || prevActiveChat.id !== conversationId) return prevActiveChat;

     const updatedDetailedMembers = prevActiveChat.detailedMembers.map(member => {
          if (member.id === newLeaderId) return { ...member, role: 'leader' };
           if (member.id === oldLeaderId) return { ...member, role: 'member' };
           return member;
      });

     return {
         ...prevActiveChat,
         leader: newLeaderId,
         detailedMembers: updatedDetailedMembers,
     };
};


// Lọc kết quả tìm kiếm user: bỏ qua những user đã là thành viên hoạt động trong nhóm
export const filterAddUserSearchResults = (rawResults, activeChatDetailedMembers) => {
    if (!rawResults || !Array.isArray(rawResults)) return [];
     const existingMemberUserIds = new Set(activeChatDetailedMembers?.map(m => m.id).filter(Boolean) || []);
     return rawResults.filter(user => user._id && !existingMemberUserIds.has(String(user._id).trim()));
};

// Cập nhật danh sách conversations sau khi thêm thành viên thành công
// apiResponse có thể chứa conversation object đã cập nhật hoặc chỉ thông tin thành công
export const updateConversationsAfterMemberAdded = (prevConvs, conversationId, apiResponse, fallbackUserData) => {
     const updatedConvData = apiResponse?.conversation || apiResponse?.data || apiResponse; // Cố gắng lấy conversation object từ response

     return prevConvs.map(conv => {
         if (conv.id === conversationId) {
              let detailedMembers;
             // Nếu API trả về conversation object đầy đủ
             if (updatedConvData && updatedConvData._id === conversationId && Array.isArray(updatedConvData.members)) {
                  detailedMembers = updatedConvData.members.map(m => ({
                     ...m,
                     id: getProcessedUserId(m.id),
                 })) || [];
             } else if (fallbackUserData) {
                 // Fallback: Thêm user vào danh sách detailedMembers hiện có
                 const addedUserDetailed = {
                       id: getProcessedUserId(fallbackUserData._id), // ID user được thêm
                       role: 'member',
                       leftAt: null,
                       addedAt: new Date().toISOString(), // Thời gian thêm
                       fullName: fallbackUserData.fullName,
                       avatar: fallbackUserData.avatar,
                       email: fallbackUserData.email,
                   };
                  detailedMembers = [...(conv.detailedMembers || []), addedUserDetailed];
             } else {
                 // Không có dữ liệu cập nhật hoặc fallback, giữ nguyên danh sách thành viên hiện tại
                 detailedMembers = conv.detailedMembers || [];
                 console.warn("updateConversationsAfterMemberAdded: API response did not contain expected conversation data, and no fallback user data provided.");
             }

              return {
                 ...conv,
                 // Cập nhật members và detailedMembers
                 members: updatedConvData?.members || conv.members, // Cập nhật members thô nếu có
                 detailedMembers: detailedMembers,
                 // Cập nhật status text
                 statusText: `${detailedMembers?.filter(m => m.leftAt === null)?.length || 0} members`,
              };
         }
         return conv;
     });
};

// Cập nhật activeChat sau khi thêm thành viên thành công
export const updateActiveChatAfterMemberAdded = (prevActiveChat, conversationId, apiResponse, fallbackUserData) => {
     if (!prevActiveChat || prevActiveChat.id !== conversationId) return prevActiveChat;

     const updatedConvData = apiResponse?.conversation || apiResponse?.data || apiResponse;

      let detailedMembers;
      if (updatedConvData && updatedConvData._id === conversationId && Array.isArray(updatedConvData.members)) {
           detailedMembers = updatedConvData.members.map(m => ({
              ...m,
              id: getProcessedUserId(m.id),
          })) || [];
      } else if (fallbackUserData) {
          const addedUserDetailed = {
                id: getProcessedUserId(fallbackUserData._id),
                role: 'member',
                leftAt: null,
                addedAt: new Date().toISOString(),
                fullName: fallbackUserData.fullName,
                avatar: fallbackUserData.avatar,
                email: fallbackUserData.email,
            };
           detailedMembers = [...(prevActiveChat.detailedMembers || []), addedUserDetailed];
      } else {
          detailedMembers = prevActiveChat.detailedMembers || [];
           console.warn("updateActiveChatAfterMemberAdded: API response did not contain expected conversation data, and no fallback user data provided.");
      }


     return {
         ...prevActiveChat,
         members: updatedConvData?.members || prevActiveChat.members,
         detailedMembers: detailedMembers,
         statusText: `${detailedMembers?.filter(m => m.leftAt === null)?.length || 0} members`,
     };
};


// Lọc conversation khỏi danh sách (dùng khi rời/xóa nhóm/cuộc hội thoại 1-1)
export const filterConversationFromList = (prevConvs, conversationId) => {
    return prevConvs.filter(conv => conv.id !== conversationId);
};

// --- Các hàm xử lý State Update cho tin nhắn (Optimistic & Server Response) ---

// Optimistic update: Đánh dấu tin nhắn là đã xóa (ẩn nội dung)
export const updateMessagesOptimisticDelete = (prevMessages, messageId) => {
     return prevMessages.map(msg =>
         msg.id === messageId ? {
             ...msg,
             isDeleted: true,
             // Xóa nội dung hoặc thay bằng placeholder tùy loại tin nhắn
             content: msg.type === 'text' ? { text: { data: '' } } :
                      (msg.type === 'file' && msg.content?.file) ? { file: { ...msg.content.file, data: null } } :
                      (msg.type === 'image' && Array.isArray(msg.content?.image)) ? { image: msg.content.image.map(img => ({ ...img, data: null })) } : msg.content, // Fallback
             // status: 'deleting', // Có thể thêm trạng thái xóa tạm thời
         } : msg
     );
};

// Revert optimistic delete nếu API lỗi
// Cần trạng thái ban đầu của tin nhắn để khôi phục
export const revertMessagesOptimisticDelete = (prevMessages, originalMessageState) => {
     if (!originalMessageState) return prevMessages; // Không có trạng thái gốc thì không làm gì

     return prevMessages.map(msg =>
         msg.id === originalMessageState.id ? {
             ...msg,
             content: originalMessageState.content,
             isDeleted: originalMessageState.isDeleted,
             status: originalMessageState.status, // Quay về trạng thái trước đó (thường là 'sent')
             time: originalMessageState.time,
             createdAt: originalMessageState.createdAt,
         } : msg
     );
};


// Optimistic update: Cập nhật nội dung tin nhắn đã chỉnh sửa
export const updateMessagesOptimisticEdit = (prevMessages, messageId, newText) => {
     return prevMessages.map(msg =>
          msg.id === messageId ? {
              ...msg,
              content: { ...msg.content, text: { ...(msg.content?.text), data: newText } },
              isEdited: true, // Đánh dấu đã chỉnh sửa
              // status: 'editing', // Có thể thêm trạng thái chỉnh sửa tạm thời
          } : msg
     );
};

// Revert optimistic edit nếu API lỗi
export const revertMessagesOptimisticEdit = (prevMessages, originalMessageState) => {
     if (!originalMessageState) return prevMessages;

     return prevMessages.map(msg =>
          msg.id === originalMessageState.id ? {
              ...msg,
              content: originalMessageState.content,
              isEdited: originalMessageState.isEdited,
              status: originalMessageState.status, // Quay về trạng thái trước đó (thường là 'sent')
              time: originalMessageState.time,
              createdAt: originalMessageState.createdAt,
          } : msg
     );
};

// Cập nhật messages sau khi edit message thành công (lấy dữ liệu từ API response)
// apiResponse được giả định là object message đã được cập nhật từ server
export const updateMessagesEditSuccess = (prevMessages, apiResponse) => {
    // Sử dụng getProcessedUserId để đảm bảo senderId nhất quán
     const processedSenderId = getProcessedUserId(apiResponse.senderId);

     // Format lại thời gian nếu API trả về last_updated hoặc datetime_created
     const updatedTime = apiResponse.last_updated || apiResponse.datetime_created;
     const formattedTime = updatedTime
          ? new Date(updatedTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
          : undefined; // Giữ nguyên thời gian cũ nếu không có updated time

     return prevMessages.map(msg =>
          msg.id === apiResponse._id ? {
              ...msg,
              content: apiResponse.content, // Sử dụng content từ API response
              isEdited: apiResponse.isEdited || false, // Sử dụng isEdited từ API response
              time: formattedTime !== undefined ? formattedTime : msg.time, // Cập nhật thời gian đã format
              createdAt: updatedTime || msg.createdAt, // Cập nhật timestamp gốc
              senderId: processedSenderId || msg.senderId, // Cập nhật senderId đã xử lý
              senderName: apiResponse.senderId?.fullName || msg.senderName, // Cập nhật tên nếu API populate
              senderAvatar: apiResponse.senderId?.avatar || msg.senderAvatar, // Cập nhật avatar nếu API populate
              status: 'sent', // Trạng thái sent
          } : msg
     );
};

// Cập nhật conversations list khi tin nhắn cuối cùng bị xóa hoặc chỉnh sửa
// Logic này khá giống updateConversationsListLatestMessage nhưng cần tìm tin nhắn cuối mới
export const updateConversationsListAfterMessageAction = (prevConvs, conversationId, messagesList, deletedMessageId) => {
    const activeConvIndex = prevConvs.findIndex(conv => conv.id === conversationId);
    if (activeConvIndex === -1) return prevConvs; // Active chat không có trong list

    const activeConv = prevConvs[activeConvIndex];

    // Chỉ cập nhật conversation nếu tin nhắn cuối cùng bị ảnh hưởng (xóa hoặc chỉnh sửa)
    // Giả định messageId là ID tin nhắn vừa bị xóa/chỉnh sửa
    if (activeConv.latestMessage !== deletedMessageId && !messagesList.find(msg => msg.id === activeConv.latestMessage)) {
         // Nếu tin nhắn cuối hiện tại vẫn còn trong danh sách messagesList
         // Hoặc nếu hành động không phải xóa tin nhắn cuối, không cần cập nhật lastMessage/time/latestMessage
         // Trừ trường hợp chỉnh sửa tin nhắn cuối - API response lúc đó sẽ là tin nhắn mới nhất
         // Logic này hơi phức tạp, chúng ta có thể đơn giản hóa: tìm tin nhắn cuối cùng *mới* trong danh sách messagesList sau khi action
         // Tìm tin nhắn cuối cùng (có timestamp mới nhất) trong danh sách tin nhắn hiện tại
         const latestMsgAfterAction = messagesList
                                        .filter(msg => !msg.isDeleted) // Bỏ qua tin nhắn đã xóa mềm (nếu có)
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];


         const updatedConversations = [...prevConvs];

         // Cập nhật thông tin tin nhắn cuối trong conversation
         updatedConversations[activeConvIndex] = {
             ...activeConv,
             lastMessage: latestMsgAfterAction ?
                           (latestMsgAfterAction.type === 'text' ? latestMsgAfterAction.content?.text?.data || '' : `[${latestMsgAfterAction.type.toUpperCase()}]`)
                           : (messagesList.length > 0 ? "[Message updated]" : "[No messages]"), // Placeholder nếu không có tin nhắn cuối mới
             time: latestMsgAfterAction?.createdAt ? new Date(latestMsgAfterAction.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : activeConv.time,
             latestMessageTimestamp: latestMsgAfterAction?.createdAt || activeConv.latestMessageTimestamp,
             latestMessage: latestMsgAfterAction?.id || null,
         };

          // Sắp xếp lại danh sách
          updatedConversations.sort((a, b) => {
            const dateA = new Date(a.latestMessageTimestamp || 0);
            const dateB = new Date(b.latestMessageTimestamp || 0);
            return dateB.getTime() - dateA.getTime();
         });

        return updatedConversations;
    }

    // Nếu tin nhắn cuối không bị ảnh hưởng (hoặc không có tin nhắn nào còn lại), không cần sắp xếp lại list
    return prevConvs;
};