import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import toast from "react-hot-toast";
import { RoleType } from "@/hooks/types/types";

// --- Interfaces ---
export interface ConversationParticipant {
  user_id: number;
  first_name: string;
  last_name: string;
  role: RoleType;
  profile_picture_url: string;
}

export interface ConversationMessage {
  id: number | string;
  sender_id: number | null;
  sender_name: string | null;
  content: string;
  created_at: string;
  isTemp?: boolean;
  tempId?: string;
  is_read?: boolean; // New: Track read status
}

export interface ConversationDetail {
  id: number;
  subject: string;
  current_user_id: number | string | null;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
}

export interface ConversationPreview {
  conversation_id: number;
  subject: string;
  receiver_id: number;
  receiver_name: string;
  last_message_preview: string;
  last_message_timestamp: string;
  unread_count: number; // New: Track unread messages count
  has_unread: boolean; // New: Quick check for unread messages
  last_read_message_id?: number | string; // New: Track last read message
}

// --- State ---
interface ConversationsState {
  list: ConversationPreview[];
  detail: ConversationDetail | null;
  listLoading: boolean;
  detailLoading: boolean;
  error: string | null;
  activeConversationId: number | null; // New: Track currently viewed conversation
}

const initialState: ConversationsState = {
  list: [],
  detail: null,
  listLoading: false,
  detailLoading: false,
  error: null,
  activeConversationId: null,
};

// Fetch all conversations (sidebar list)
export const fetchConversations = createAsyncThunk(
  "conversations/fetchAll",
  async (_, ThunkApi) => {
    try {
      const res = await privateApi.get<ConversationPreview[]>(
        "/messaging/conversations"
      );
      // Initialize unread counts if not provided by backend
      const conversationsWithUnread = res.data.map((convo) => ({
        ...convo,
        unread_count: convo.unread_count || 0,
        has_unread: (convo.unread_count || 0) > 0,
      }));
      return conversationsWithUnread;
    } catch (err: any) {
      return ThunkApi.rejectWithValue(
        err.response?.data?.detail || "Failed to fetch conversations"
      );
    }
  }
);

// Fetch a single conversation detail
export const fetchConversationDetail = createAsyncThunk(
  "conversations/fetchDetail",
  async (id: number, ThunkApi) => {
    try {
      const res = await privateApi.get<ConversationDetail>(
        `/messaging/conversations/${id}/`
      );
      return res.data;
    } catch (err: any) {
      return ThunkApi.rejectWithValue(
        err.response?.data?.detail || "Failed to fetch conversation detail"
      );
    }
  }
);

// New: Mark conversation as read
export const markConversationAsRead = createAsyncThunk(
  "conversations/markAsRead",
  async (conversationId: number, ThunkApi) => {
    try {
      await privateApi.post(
        `/messaging/conversations/${conversationId}/mark-read/`
      );
      return conversationId;
    } catch (err: any) {
      // Don't reject on error, just log it
      console.warn("Failed to mark conversation as read:", err);
      return conversationId;
    }
  }
);

const conversationsSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    resetDetail: (state) => {
      state.detail = null;
      state.detailLoading = false;
      state.activeConversationId = null;
    },

    updateDetail: (state, action: PayloadAction<ConversationDetail>) => {
      state.detail = action.payload;
      state.activeConversationId = action.payload.id;
    },

    // New: Set active conversation (when user opens a conversation)
    setActiveConversation: (state, action: PayloadAction<number>) => {
      state.activeConversationId = action.payload;

      // Mark as read when opening
      const conversation = state.list.find(
        (convo) => convo.conversation_id === action.payload
      );
      if (conversation) {
        conversation.unread_count = 0;
        conversation.has_unread = false;
      }
    },

    updateConversationPreview: (
      state,
      action: PayloadAction<{
        conversation_id: number;
        subject?: string;
        receiver_id: number;
        receiver_name: string;
        last_message_preview: string;
        last_message_timestamp: string;
        sender_id?: number; // New: To determine if message is from current user
        current_user_id?: number | null | string; // New: To compare with sender
      }>
    ) => {
      const existingConvo = state.list.find(
        (convo) => convo.conversation_id === action.payload.conversation_id
      );

      const isFromCurrentUser =
        action.payload.sender_id === action.payload.current_user_id;
      const isActiveConversation =
        state.activeConversationId === action.payload.conversation_id;

      if (existingConvo) {
        existingConvo.last_message_preview =
          action.payload.last_message_preview;
        existingConvo.last_message_timestamp =
          action.payload.last_message_timestamp;

        // Only increment unread count if:
        // 1. Message is not from current user
        // 2. Conversation is not currently active/open
        if (!isFromCurrentUser && !isActiveConversation) {
          existingConvo.unread_count = (existingConvo.unread_count || 0) + 1;
          existingConvo.has_unread = true;
        }

        // Move conversation to top of list (most recent first)
        const index = state.list.indexOf(existingConvo);
        if (index > 0) {
          state.list.splice(index, 1);
          state.list.unshift(existingConvo);
        }
      } else {
        // New conversation
        const newConvo: ConversationPreview = {
          conversation_id: action.payload.conversation_id,
          subject: action.payload.subject || "",
          receiver_id: action.payload.receiver_id,
          receiver_name: action.payload.receiver_name,
          last_message_preview: action.payload.last_message_preview,
          last_message_timestamp: action.payload.last_message_timestamp,
          unread_count: !isFromCurrentUser && !isActiveConversation ? 1 : 0,
          has_unread: !isFromCurrentUser && !isActiveConversation,
        };

        // Add to beginning of list
        state.list.unshift(newConvo);
      }
    },

    // New: Manually mark conversation as read (for UI updates)
    markAsRead: (state, action: PayloadAction<number>) => {
      const conversation = state.list.find(
        (convo) => convo.conversation_id === action.payload
      );
      if (conversation) {
        conversation.unread_count = 0;
        conversation.has_unread = false;
      }
    },

    // New: Update unread count for a specific conversation
    updateUnreadCount: (
      state,
      action: PayloadAction<{ conversationId: number; count: number }>
    ) => {
      const conversation = state.list.find(
        (convo) => convo.conversation_id === action.payload.conversationId
      );
      if (conversation) {
        conversation.unread_count = action.payload.count;
        conversation.has_unread = action.payload.count > 0;
      }
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.listLoading = false;
        state.list = action.payload;
        toast.success("Conversations loaded");
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload as string;
      });

    // Detail
    builder
      .addCase(fetchConversationDetail.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchConversationDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detail = action.payload;
        state.activeConversationId = action.payload.id;

        // Mark as read when conversation details are loaded
        const conversation = state.list.find(
          (convo) => convo.conversation_id === action.payload.id
        );
        if (conversation) {
          conversation.unread_count = 0;
          conversation.has_unread = false;
        }
      })
      .addCase(fetchConversationDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload as string;
      });

    // Mark as read
    builder.addCase(markConversationAsRead.fulfilled, (state, action) => {
      const conversation = state.list.find(
        (convo) => convo.conversation_id === action.payload
      );
      if (conversation) {
        conversation.unread_count = 0;
        conversation.has_unread = false;
      }
    });
  },
});

export const {
  resetDetail,
  updateDetail,
  updateConversationPreview,
  setActiveConversation,
  markAsRead,
  updateUnreadCount,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
