import { useMutation } from "@tanstack/react-query";
import { LuDownload } from "react-icons/lu";
import { AdminApi } from "@api/admin";
import { Button } from "@components/core/Button";

/** Downloads conversations as one Markdown file; all users unless userId is set. */
export function ExportConversationsButton({ userId }: { userId?: string }) {
  const exportChats = useMutation({
    mutationFn: () => AdminApi.exportConversations(userId),
    onSuccess: (blob) => {
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = userId
        ? `conversatii-${userId.slice(0, 8)}-${date}.md`
        : `conversatii-${date}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div className="flex items-center gap-2">
      {exportChats.isError && (
        <span className="text-xs text-red-400">
          {exportChats.error.message}
        </span>
      )}
      <Button
        size="default"
        className="gap-2"
        disabled={exportChats.isPending}
        onClick={() => exportChats.mutate()}
      >
        <LuDownload className="size-4" />
        {exportChats.isPending ? "Se exportă…" : "Exportă conversațiile"}
      </Button>
    </div>
  );
}
