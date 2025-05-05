import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface MessageState {
  unreadMessagesCount: number;
  unreadGroupMessagesCount: number;
  lastMessageTimestamp: number | null;
}

const initialState: MessageState = {
  unreadMessagesCount: 0,
  unreadGroupMessagesCount: 0,
  lastMessageTimestamp: null,
};

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    incrementUnreadMessages: (state) => {
      state.unreadMessagesCount += 1;
      state.lastMessageTimestamp = Date.now();
    },
    incrementUnreadGroupMessages: (state) => {
      state.unreadGroupMessagesCount += 1;
      state.lastMessageTimestamp = Date.now();
    },
    resetUnreadMessages: (state) => {
      state.unreadMessagesCount = 0;
    },
    resetUnreadGroupMessages: (state) => {
      state.unreadGroupMessagesCount = 0;
    },
    setUnreadMessages: (state, action: PayloadAction<number>) => {
      state.unreadMessagesCount = action.payload;
    },
    setUnreadGroupMessages: (state, action: PayloadAction<number>) => {
      state.unreadGroupMessagesCount = action.payload;
    },
  },
});

export const {
  incrementUnreadMessages,
  incrementUnreadGroupMessages,
  resetUnreadMessages,
  resetUnreadGroupMessages,
  setUnreadMessages,
  setUnreadGroupMessages,
} = messageSlice.actions;

export default messageSlice.reducer;
