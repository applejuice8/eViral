import { Suspense } from "react";
import { ReviewCampaign, ReviewSkeleton } from "@/components/review/review-campaign";

// campaign id is known at request time, so the client part needs Suspense
export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <ReviewCampaign />
    </Suspense>
  );
}
