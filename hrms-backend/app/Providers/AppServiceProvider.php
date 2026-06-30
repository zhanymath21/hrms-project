<?php

namespace App\Providers;

use App\Services\EmployeeImportExportService;
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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
