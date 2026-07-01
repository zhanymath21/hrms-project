<?php
// app/Enums/LeaveStatusEnum.php

namespace App\Enums;

enum LeaveStatusEnum: string
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case CANCELLED = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => 'warning',
            self::APPROVED => 'success',
            self::REJECTED => 'error',
            self::CANCELLED => 'default',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
