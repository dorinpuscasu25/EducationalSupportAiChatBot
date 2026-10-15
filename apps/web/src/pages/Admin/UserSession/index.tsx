import { useNavigate } from "@tanstack/react-router";
import { AdminApi } from "@api/admin";
import { ChatsApi } from "@api/chats";
import { LuArrowLeft } from "react-icons/lu";
import { twJoin } from "tailwind-merge";
import { MessageItem } from "@components/display/Chat";
import { useAdminUserDetail, useAdminUserSession } from "@apiQuery/query/admin";
import { PageHeader } from "@components/layout/PageHeader";
import { formatDateTime } from "@utils/format";

/**
 * Read-only replay of one user conversation, rendered with the same message
 * component the user's chat uses, so the admin sees exactly what they saw.
 */
export function UserSessionPage({
  userId,
  chatId,
}: {
  userId: string;
  chatId: string;
}) {
  const navigate = useNavigate();
  const detail = useAdminUserDetail(userId);
  const session = useAdminUserSession(userId, chatId);

  const messages = session.data?.messages ?? [];

  const user = detail.data?.user;
  const chat = session.data;

  return (
    <>
      <PageHeader
        title={chat?.title || "Sesiune fără titlu"}
        subtitle={
          user ? `${user.first_name} ${user.last_name} · ${user.email}` : ""
        }
        right={
          <button
            onClick={() =>
              navigate({ to: "/admin/users/$userId", params: { userId } })
            }
            className="text-muted flex items-center gap-2 text-sm hover:text-white"
          >
            <LuArrowLeft className="size-4" /> Cursant
          </button>
        }
      />

      <div className="p-8">
        {session.isLoading ? (
          <div className="text-muted text-sm">Se încarcă…</div>
        ) : session.isError || !chat ? (
          <div className="text-muted text-sm">
            Conversația nu a fost găsită.
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            <div className="text-muted border-border mb-6 flex flex-wrap gap-x-4 gap-y-1 border-b pb-4 text-xs">
              <span>Începută {formatDateTime(chat.created_at)}</span>
              <span>Ultima activitate {formatDateTime(chat.updated_at)}</span>
              <span>{messages.length} mesaje</span>
            </div>

            {messages.length === 0 ? (
              <div className="text-muted text-sm">Niciun mesaj.</div>
            ) : (
              <div className="flex flex-col gap-8 pb-10">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div
                      className={twJoin(
                        "text-muted mb-1 text-[11px]",
                        message.role === "user" && "text-right",
                      )}
                    >
                      {message.role === "user" ? "Cursant" : "Asistent"} ·{" "}
                      {formatDateTime(message.created_at)}
                    </div>
                    <MessageItem
                      message={{
                        ...message,
                        server_id: message.id,
                        complete: true,
                      }}
                      readOnly
                      loadAttachment={(attachmentId) =>
                        ChatsApi.fetchFile(
                          AdminApi.userSessionAttachmentPath(
                            userId,
                            chatId,
                            attachmentId,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
