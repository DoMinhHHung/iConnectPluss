// react-icons.d.ts - File định nghĩa loại cho react-icons
import React from "react";
import * as ReactIcons from "react-icons/fi";

declare module "react-icons/fi" {
  type IconType = React.FC<{
    className?: string;
    size?: string | number;
    color?: string;
    style?: React.CSSProperties;
  }>;

  // Ghi đè tất cả biểu tượng từ Feather icons (Fi)
  export const FiMoreVertical: IconType;
  export const FiSearch: IconType;
  export const FiArchive: IconType;
  export const FiTrash2: IconType;
  export const FiX: IconType;
  export const FiFileText: IconType;
  export const FiPaperclip: IconType;
  export const FiImage: IconType;
  export const FiVideo: IconType;
  export const FiMusic: IconType;
  export const FiSend: IconType;
  export const FiPlus: IconType;
  export const FiUsers: IconType;
  export const FiSettings: IconType;
  export const FiUserPlus: IconType;
  export const FiUserX: IconType;
  export const FiUser: IconType;
  export const FiUserCheck: IconType;
}
