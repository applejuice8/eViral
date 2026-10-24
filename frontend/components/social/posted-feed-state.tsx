import { Button } from "@/components/ui/button";

interface PostedFeedStateProps {
  status: "loading" | "loaded" | "error";
  postCount: number;
  error: string | null;
  onRetry: () => void;
}

export function PostedFeedState({ status, postCount, error, onRetry }: PostedFeedStateProps) {
  if (status === "loading") {
    return <p role="status" className="py-8 text-center text-[13px] text-gray-500">Loading posts...</p>;
  }

  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-[13px] text-danger-700">Could not load published posts. {error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  if (postCount === 0) {
    return <p className="py-8 text-center text-[13px] text-gray-500">No posts have been published to this platform yet.</p>;
  }

  return null;
}