import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
    variant?: 'list' | 'detail' | 'grid' | 'dashboard';
}

export function PageSkeleton({ variant = 'list' }: PageSkeletonProps) {
    if (variant === 'dashboard') {
        return (
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-28" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                </div>

                {/* Table */}
                <Skeleton className="h-64 rounded-xl" />
            </div>
        );
    }

    if (variant === 'detail') {
        return (
            <div className="space-y-6">
                {/* Back Button */}
                <Skeleton className="h-8 w-32" />

                {/* Header Card */}
                <Skeleton className="h-32 rounded-xl" />

                {/* Tabs */}
                <Skeleton className="h-10 w-64" />

                {/* Content */}
                <Skeleton className="h-96 rounded-xl" />
            </div>
        );
    }

    if (variant === 'grid') {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* Filters */}
                <div className="flex gap-3">
                    <Skeleton className="h-10 flex-1 max-w-md" />
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-40" />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        );
    }

    // Default: list variant
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                <Skeleton className="h-10 flex-1 max-w-md" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
            </div>

            {/* List Items */}
            <div className="space-y-4">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
        </div>
    );
}
