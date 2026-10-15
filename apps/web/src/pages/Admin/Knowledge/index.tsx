import { useState } from "react";
import { AdminKnowledgePage } from "@components/page/AdminKnowledgePage";
import { useKnowledge, useKnowledgeSearch } from "@apiQuery/query/admin";
import { useSyncKnowledge } from "@apiQuery/mutation/admin";
import { errorMessage } from "@utils/errors";
import { loadFailure } from "../load-failure";

export const AdminKnowledgeContainer = () => {
  const knowledge = useKnowledge();
  const sync = useSyncKnowledge();
  const [query, setQuery] = useState("");
  const search = useKnowledgeSearch(query);

  return (
    <AdminKnowledgePage
      overview={knowledge.data}
      loading={knowledge.isLoading}
      loadFailure={loadFailure(knowledge)}
      onSync={(force) => sync.mutate(force)}
      syncPending={sync.isPending}
      syncError={sync.isError ? errorMessage(sync.error) : undefined}
      searchQuery={query}
      onSearch={setQuery}
      searchResults={search.data}
      searchLoading={search.isFetching}
    />
  );
};
