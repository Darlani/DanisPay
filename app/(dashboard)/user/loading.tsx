import UserDashboardSkeleton from "@/components/skeletons/UserDashboardSkeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
      <UserDashboardSkeleton />
    </div>
  );
}
