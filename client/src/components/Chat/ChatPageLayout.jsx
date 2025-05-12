import React from 'react';
import ConversationListPanel from './ConversationListPanel';
import ChatWindow from './ChatWindow';
import ChatSettingsOverlay from './ChatSettingsOverlay';
import './Chat.scss';

const ChatPageLayout = ({
  isAuthLoading,
  isAuthenticated,
  error,
  isLoadingConversations,
  isLoadingMessages,
  isPerformingAction,
  sendingMessage,
  actionError,
  conversations,
  activeChat,
  messages,
  searchTerm,
  isMobileChatActive,
  isSettingsOpen,
  addUserSearchResults,
  setAddUserSearchResults,
  messageInput,
  editingMessageId,
  isEditingName,
  editingGroupName,
  currentUserId,
  handlers,
  setMessageInput, // Added to fix ChatWindow prop
  setSearchTerm,
  onUploadBeforeBegin,
  onClientUploadComplete,
  onUploadError,
  onUploadProgress,
  userInfo,
  socket,
}) => {
  // Filter conversations for groups and friends
  const filteredConversations = conversations.filter((conv) => {
    const nameMatch =
      conv?.name &&
      typeof conv.name === "string" &&
      conv.name.toLowerCase().includes(searchTerm);
    return nameMatch;
  });

  // console.log("activechat: ", activeChat);

  const filteredGroups = filteredConversations.filter((c) => c.isGroup);
  const filteredFriends = filteredConversations.filter((c) => !c.isGroup);

  // Determine rendering conditions
  const showInitialLoading =
    isAuthLoading ||
    (isAuthenticated &&
      currentUserId &&
      isLoadingConversations &&
      !activeChat &&
      !error);
  const showAuthError = !isAuthLoading && !isAuthenticated;
  const showGeneralError =
    error &&
    !isLoadingConversations &&
    !isLoadingMessages &&
    !isPerformingAction &&
    !sendingMessage &&
    !actionError &&
    isAuthenticated;

  // Render loading state
  if (showInitialLoading) {
    return (
      <div className="chat-page-container">
        <div className="loading-overlay">Loading conversations...</div>
      </div>
    );
  }

  // Render authentication error
  if (showAuthError) {
    return (
      <div className="chat-page-container">
        <div className="error-message">
          Error: {error || "User not authenticated. Please login."}
        </div>
      </div>
    );
  }

  // Render general error
  if (showGeneralError) {
    console.error("Rendering with general error:", error);
    return (
      <div className="chat-page-container">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  // Render main chat UI
  return (
    <div
      className={`chat-page-container ${
        isMobileChatActive ? "chat-active-mobile" : ""
      }`}
    >
      <ConversationListPanel
        groups={filteredGroups}
        friends={filteredFriends}
        onSearchChange={handlers.handleSearchChange}
        onItemClick={handlers.handleConversationClick}
        activeChat={activeChat}
        onAddClick={() => setAddUserSearchResults([])}
        onAddUserSearch={handlers.handleAddUserSearch} // Thêm prop
        onCreateConversation={handlers.handleCreateConversation} // Thêm prop
        addUserSearchResults={addUserSearchResults}
        searchTerm={searchTerm}
      />

      <ChatWindow
        activeContact={activeChat}
        messages={messages}
        onMobileBack={handlers.handleMobileBack}
        isMobile={isMobileChatActive}
        messageInput={messageInput}
        setMessageInput={setMessageInput} // Fixed: Use setMessageInput instead of setSearchTerm
        onSendTextMessage={handlers.handleSendTextMessage}
        onSendFile={handlers.handleSendFile}
        onSaveEditedMessage={handlers.handleSaveEditedMessage}
        onCancelEdit={handlers.handleCancelEdit}
        isLoadingMessages={isLoadingMessages}
        onOpenSettings={
          activeChat?.isGroup ? handlers.handleOpenSettings : null
        }
        onDeleteMessage={handlers.handleDeleteMessage}
        onEditMessage={handlers.handleInitiateEditMessage}
        currentUserId={currentUserId}
        sendingMessage={sendingMessage}
        editingMessageId={editingMessageId}
        onUploadBeforeBegin={onUploadBeforeBegin}
        onClientUploadComplete={onClientUploadComplete}
        onUploadError={onUploadError}
        onUploadProgress={onUploadProgress}
        userInfo = {userInfo}
        socket={socket}
      />

      {isSettingsOpen && activeChat?.isGroup && activeChat.detailedMembers && (
        <ChatSettingsOverlay
          group={activeChat}
          currentUserId={currentUserId}
          onClose={handlers.handleCloseSettings}
          onRemoveUser={handlers.handleRemoveUser}
          onChangeLeader={handlers.handleChangeLeader}
          onStepDownLeader={handlers.handleStepDownLeader}
          onAddUserSearch={handlers.handleAddUserSearch}
          onAddUserConfirm={handlers.handleAddUserConfirm}
          isPerformingAction={isPerformingAction}
          actionError={actionError}
          searchResults={addUserSearchResults}
          onLeaveGroup={handlers.handleLeaveGroup}
          onDeleteGroup={handlers.handleDeleteGroup}
          onUpdateGroupName={handlers.handleUpdateGroupName}
          isEditingName={isEditingName}
          editingGroupName={editingGroupName}
          onStartEditGroupName={handlers.handleStartEditGroupName}
          onCancelEditGroupName={handlers.handleCancelEditGroupName}
          onSaveEditGroupName={handlers.handleSaveEditGroupName}
        />
      )}
    </div>
  );
};

export default ChatPageLayout;