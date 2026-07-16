<?php

namespace App\Providers;

use App\Services\EmployeeImportExportService;
use App\Services\Leave\HierarchicalApprovalService;
use App\Services\Leave\LeaveApprovalService;
use App\Services\Leave\LeaveBalanceService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(EmployeeImportExportService::class, function ($app) {
            return new EmployeeImportExportService();
        });

        $this->app->singleton(HierarchicalApprovalService::class, function ($app) {
            return new HierarchicalApprovalService();
        });

        $this->app->singleton(LeaveApprovalService::class, function ($app) {
            return new LeaveApprovalService(
                $app->make(HierarchicalApprovalService::class)
            );
        });

        $this->app->singleton(LeaveBalanceService::class, function ($app) {
            return new LeaveBalanceService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}