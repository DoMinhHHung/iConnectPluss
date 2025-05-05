import React from "react";
import { useParams } from "react-router-dom";
import GroupList from "../components/GroupList";
import GroupChatInterface from "../components/GroupChatInterface";
import "../scss/GroupPage.scss";

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId?: string }>();

  return (
    <div className="group-page">
      {!groupId ? (
        <div className="group-list-wrapper">
          <GroupList />
        </div>
      ) : (
        <div className="group-chat-wrapper">
          <GroupChatInterface />
        </div>
      )}
    </div>
  );
};

export default GroupPage;
