import { Suspense } from "react";
import { ReviewCampaign, ReviewSkeleton } from "@/components/review/review-campaign";

// The campaign id is only known at request time, so the client part that
// reads it sits in its own Suspense boundary.
export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <ReviewCampaign />
    </Suspense>
  );
}
