import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import toast from "react-hot-toast";

// --- Interfaces ---
export interface ConversationParticipant {
  user_id: number;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture_url?: string;
}

export interface ConversationMessage {
  id: number | string;
  sender_id: number | null;
  sender_name: string | null;
  content: string;
  created_at: string;
  isTemp?: boolean;
  tempId?: string;
}

export interface ConversationDetail {
  id: number;
  subject: string;
  current_user_id: number;
  participants: ConversationParticipant[];
  messages: ConversationMessage[];
}

export interface ConversationPreview {
  conversation_id: number;
  subject: string;
  receiver_id: number;
  receiver_name: string;
  receiver_role: string;
  last_message_preview: string;
  last_message_timestamp: string;
  unread_count: number;
}

export interface Contact {
  user_id: number;
  first_name: string;
  last_name: string;
  role: string;
  profile_picture_url?: string;
  is_blocked: boolean;
}

// --- State ---
interface ConversationsState {
  list: ConversationPreview[];
  detail: ConversationDetail | null;
  contacts: Contact[];
  listLoading: boolean;
  detailLoading: boolean;
  contactsLoading: boolean;
  error: string | null;
  activeConversationId: number | null;
  onlineUserIds: number[];
}

const initialState: ConversationsState = {
  list: [],
  detail: null,
  contacts: [],
  listLoading: false,
  detailLoading: false,
  contactsLoading: false,
  error: null,
  activeConversationId: null,
  onlineUserIds: [],
};

// --- Thunks ---

// Fetch all conversations (sidebar list)
export const fetchConversations = createAsyncThunk(
  "conversations/fetchAll",
  async (_, ThunkApi) => {
    try {
      const res = await privateApi.get<ConversationPreview[]>("/messaging/conversations");
      return res.data;
    } catch (err: any) {
      return ThunkApi.rejectWithValue(err.response?.data?.detail || "Failed to fetch conversations");
    }
  }
);

// Fetch a single conversation detail
export const fetchConversationDetail = createAsyncThunk(
  "conversations/fetchDetail",
  async (id: number, ThunkApi) => {
    try {
      const res = await privateApi.get<ConversationDetail>(`/messaging/conversations/${id}`);
      return res.data;
    } catch (err: any) {
      return ThunkApi.rejectWithValue(err.response?.data?.detail || "Failed to fetch conversation details");
    }
  }
);

// Fetch allowed contacts
export const fetchContacts = createAsyncThunk(
  "conversations/fetchContacts",
  async (_, ThunkApi) => {
    try {
      const res = await privateApi.get<Contact[]>("/messaging/contacts");
      return res.data;
    } catch (err: any) {
      return ThunkApi.rejectWithValue(err.response?.data?.detail || "Failed to fetch contacts");
    }
  }
);

// Block/Unblock user
export const blockUnblockUser = createAsyncThunk(
  "conversations/blockUnblock",
  async ({ userId, action }: { userId: number; action: 'block' | 'unblock' }, ThunkApi) => {
    try {
      await privateApi.post(`/messaging/${action}/${userId}`);
      toast.success(`User ${action}ed successfully`);
      return { userId, action };
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to ${action} user`);
      return ThunkApi.rejectWithValue(err.response?.data?.detail || "Action failed");
    }
  }
);

// Mark conversation as read
export const markConversationAsRead = createAsyncThunk(
  "conversations/markAsRead",
  async (conversationId: number, ThunkApi) => {
    try {
      // In the new backend, fetching details marks as read
      // But we can keep it as a placeholder or explicit call if needed later
      return conversationId;
    } catch (err: any) {
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
    },
    setActiveConversation: (state, action: PayloadAction<number>) => {
      state.activeConversationId = action.payload;
    },
    updateConversationPreview: (state, action: PayloadAction<any>) => {
      const payload = action.payload;
      const index = state.list.findIndex(c => c.conversation_id === payload.conversation_id);

      const isFromMe = payload.sender_id === payload.current_user_id;
      const isActive = state.activeConversationId === payload.conversation_id;

      if (index !== -1) {
        const updated = { ...state.list[index] };
        updated.last_message_preview = payload.last_message_preview;
        updated.last_message_timestamp = payload.last_message_timestamp;
        if (!isFromMe && !isActive) {
          updated.unread_count += 1;
        }
        state.list.splice(index, 1);
        state.list.unshift(updated);
      } else {
        // New conversation incoming
        state.list.unshift({
          conversation_id: payload.conversation_id,
          receiver_id: payload.sender_id,
          receiver_name: payload.sender_name,
          receiver_role: payload.sender_role || "Unknown",
          subject: payload.subject || "",
          last_message_preview: payload.last_message_preview,
          last_message_timestamp: payload.last_message_timestamp,
          unread_count: isFromMe || isActive ? 0 : 1
        });
      }
    },
    setOnlineUsers: (state, action: PayloadAction<number[]>) => {
      state.onlineUserIds = action.payload;
    },
    setUserOnline: (state, action: PayloadAction<number>) => {
      if (!state.onlineUserIds.includes(action.payload)) {
        state.onlineUserIds.push(action.payload);
      }
    },
    setUserOffline: (state, action: PayloadAction<number>) => {
      state.onlineUserIds = state.onlineUserIds.filter(id => id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => { state.listLoading = true; })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.listLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchConversationDetail.pending, (state) => { state.detailLoading = true; })
      .addCase(fetchConversationDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detail = action.payload;
        state.activeConversationId = action.payload.id;
        // Zero out unread count in list if it exists
        const convo = state.list.find(c => c.conversation_id === action.payload.id);
        if (convo) convo.unread_count = 0;
      })
      .addCase(fetchContacts.pending, (state) => { state.contactsLoading = true; })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.contactsLoading = false;
        state.contacts = action.payload;
      })
      .addCase(blockUnblockUser.fulfilled, (state, action) => {
        const { userId, action: act } = action.payload;
        const contact = state.contacts.find(c => c.user_id === userId);
        if (contact) {
          contact.is_blocked = (act === 'block');
        }
      });
  },
});

export const { resetDetail, updateDetail, setActiveConversation, updateConversationPreview, setOnlineUsers, setUserOnline, setUserOffline } = conversationsSlice.actions;
export default conversationsSlice.reducer;
