<?php
// app/Services/Leave/HierarchicalApprovalService.php

namespace App\Services\Leave;

use App\Models\Employee;
use App\Models\Leave;
use App\Models\LeaveApproval;
use Illuminate\Support\Facades\Log;

class HierarchicalApprovalService
{
    /**
     * Get approval hierarchy for an employee
     */
    public function getApprovalHierarchy(Employee $employee): array
    {
        $hierarchy = [];
        $currentEmployee = $employee;
        $level = 1;

        // 1. Get direct manager if exists
        if ($employee->manager_id) {
            $manager = Employee::with('position')->find($employee->manager_id);
            if ($manager) {
                $hierarchy[] = [
                    'level' => $level++,
                    'manager' => [
                        'id' => $manager->id,
                        'name' => $manager->first_name . ' ' . $manager->last_name,
                        'employee_id' => $manager->employee_id,
                        'position' => $manager->position->title ?? 'Manager',
                    ],
                ];
                $currentEmployee = $manager;
            }
        }

        // 2. Traverse up the management chain (skip if only one manager)
        while ($currentEmployee && $currentEmployee->manager_id && $level <= 3) {
            $manager = Employee::with('position')->find($currentEmployee->manager_id);
            if ($manager && !$this->existsInHierarchy($hierarchy, $manager->id)) {
                $hierarchy[] = [
                    'level' => $level++,
                    'manager' => [
                        'id' => $manager->id,
                        'name' => $manager->first_name . ' ' . $manager->last_name,
                        'employee_id' => $manager->employee_id,
                        'position' => $manager->position->title ?? 'Manager',
                    ],
                ];
                $currentEmployee = $manager;
            } else {
                break;
            }
        }

        // 3. Add HR Manager if not already in hierarchy and exists
        $hrManager = Employee::whereHas('position', function ($q) {
            $q->where('title', 'HR Manager');
        })->first();

        if ($hrManager && !$this->existsInHierarchy($hierarchy, $hrManager->id)) {
            $hierarchy[] = [
                'level' => $level++,
                'manager' => [
                    'id' => $hrManager->id,
                    'name' => $hrManager->first_name . ' ' . $hrManager->last_name,
                    'employee_id' => $hrManager->employee_id,
                    'position' => 'HR Manager',
                ],
            ];
        }

        // 4. Add GM if exists and not already in hierarchy
        $gm = Employee::whereHas('position', function ($q) {
            $q->where('title', 'GM')->orWhere('title', 'General Manager');
        })->first();

        if ($gm && !$this->existsInHierarchy($hierarchy, $gm->id)) {
            $hierarchy[] = [
                'level' => $level++,
                'manager' => [
                    'id' => $gm->id,
                    'name' => $gm->first_name . ' ' . $gm->last_name,
                    'employee_id' => $gm->employee_id,
                    'position' => 'GM',
                ],
            ];
        }

        // 5. Add CEO if exists and not already in hierarchy
        $ceo = Employee::whereHas('position', function ($q) {
            $q->where('title', 'CEO')->orWhere('title', 'Chief Executive Officer');
        })->first();

        if ($ceo && !$this->existsInHierarchy($hierarchy, $ceo->id)) {
            $hierarchy[] = [
                'level' => $level++,
                'manager' => [
                    'id' => $ceo->id,
                    'name' => $ceo->first_name . ' ' . $ceo->last_name,
                    'employee_id' => $ceo->employee_id,
                    'position' => 'CEO',
                ],
            ];
        }

        // 6. If still no hierarchy, use default flow
        if (empty($hierarchy)) {
            $hierarchy = $this->getDefaultFlow();
        }

        return $hierarchy;
    }

    /**
     * Get smart approval flow (auto-adapts to available managers)
     */
    public function getSmartApprovalFlow(Employee $employee): array
    {
        $hierarchy = $this->getApprovalHierarchy($employee);
        $flow = [];

        foreach ($hierarchy as $level) {
            $flow[] = [
                'level' => $level['level'],
                'stage_name' => "Level {$level['level']}: {$level['manager']['position']} Approval",
                'approver_id' => $level['manager']['id'],
                'approver_name' => $level['manager']['name'],
                'approver_position' => $level['manager']['position'],
                'status' => 'pending',
            ];
        }

        // If no flow, create default with HR Manager
        if (empty($flow)) {
            $hrManager = Employee::whereHas('position', function ($q) {
                $q->where('title', 'HR Manager');
            })->first();

            if ($hrManager) {
                $flow[] = [
                    'level' => 1,
                    'stage_name' => 'HR Manager Approval',
                    'approver_id' => $hrManager->id,
                    'approver_name' => $hrManager->first_name . ' ' . $hrManager->last_name,
                    'approver_position' => 'HR Manager',
                    'status' => 'pending',
                ];
            }
        }

        return $flow;
    }

    /**
     * Create approval flow for leave request
     */
    public function createApprovalFlow(Leave $leave, Employee $employee): array
    {
        return $this->getSmartApprovalFlow($employee);
    }

    /**
     * Check if a manager can approve a specific employee's request
     */
    public function canApprove(Employee $manager, Employee $employee): bool
    {
        // Same person cannot approve own request
        if ($manager->id === $employee->id) {
            return false;
        }

        // Get hierarchy and check if manager is in it
        $hierarchy = $this->getApprovalHierarchy($employee);
        foreach ($hierarchy as $level) {
            if ($level['manager']['id'] === $manager->id) {
                return true;
            }
        }

        // Special case: CEO can approve everyone
        if ($manager->position && $manager->position->title === 'CEO') {
            return true;
        }

        // Special case: HR Manager can approve everyone
        if ($manager->position && $manager->position->title === 'HR Manager') {
            return true;
        }

        // Special case: GM can approve everyone
        if ($manager->position && $manager->position->title === 'GM') {
            return true;
        }

        return false;
    }

    /**
     * Get subordinates for a manager
     */
    public function getSubordinates(Employee $manager): array
    {
        return Employee::where('manager_id', $manager->id)
            ->where('status', 'active')
            ->get()
            ->map(function ($emp) {
                return [
                    'id' => $emp->id,
                    'name' => $emp->first_name . ' ' . $emp->last_name,
                    'employee_id' => $emp->employee_id,
                    'position' => $emp->position->title ?? 'N/A',
                ];
            })
            ->toArray();
    }

    /**
     * Get all employees under a manager (including indirect reports)
     */
    public function getAllSubordinates(Employee $manager): array
    {
        $subordinates = [];
        $directReports = Employee::where('manager_id', $manager->id)
            ->where('status', 'active')
            ->get();

        foreach ($directReports as $report) {
            $subordinates[] = [
                'id' => $report->id,
                'name' => $report->first_name . ' ' . $report->last_name,
                'employee_id' => $report->employee_id,
                'position' => $report->position->title ?? 'N/A',
                'direct' => true,
            ];

            $indirect = $this->getAllSubordinates($report);
            foreach ($indirect as $sub) {
                $sub['direct'] = false;
                $subordinates[] = $sub;
            }
        }

        // If manager has no direct reports, still allow them to approve their team
        if (empty($subordinates)) {
            // Check if this manager is in any employee's hierarchy
            $employees = Employee::where('status', 'active')
                ->where('id', '!=', $manager->id)
                ->get();

            foreach ($employees as $emp) {
                $hierarchy = $this->getApprovalHierarchy($emp);
                foreach ($hierarchy as $level) {
                    if ($level['manager']['id'] === $manager->id) {
                        $subordinates[] = [
                            'id' => $emp->id,
                            'name' => $emp->first_name . ' ' . $emp->last_name,
                            'employee_id' => $emp->employee_id,
                            'position' => $emp->position->title ?? 'N/A',
                            'direct' => false,
                        ];
                        break;
                    }
                }
            }
        }

        return $subordinates;
    }

    /**
     * Get default flow for employees without managers
     */
    private function getDefaultFlow(): array
    {
        $flow = [];
        $level = 1;

        // Try to get HR Manager
        $hrManager = Employee::whereHas('position', function ($q) {
            $q->where('title', 'HR Manager');
        })->first();

        if ($hrManager) {
            $flow[] = [
                'level' => $level++,
                'manager' => [
                    'id' => $hrManager->id,
                    'name' => $hrManager->first_name . ' ' . $hrManager->last_name,
                    'employee_id' => $hrManager->employee_id,
                    'position' => 'HR Manager',
                ],
            ];
        }

        // Try to get GM
        $gm = Employee::whereHas('position', function ($q) {
            $q->where('title', 'GM')->orWhere('title', 'General Manager');
        })->first();

        if ($gm) {
            $flow[] = [
                'level' => $level++,
                'manager' => [
                    'id' => $gm->id,
                    'name' => $gm->first_name . ' ' . $gm->last_name,
                    'employee_id' => $gm->employee_id,
                    'position' => 'GM',
                ],
            ];
        }

        // Try to get CEO
        $ceo = Employee::whereHas('position', function ($q) {
            $q->where('title', 'CEO')->orWhere('title', 'Chief Executive Officer');
        })->first();

        if ($ceo) {
            $flow[] = [
                'level' => $level++,
                'manager' => [
                    'id' => $ceo->id,
                    'name' => $ceo->first_name . ' ' . $ceo->last_name,
                    'employee_id' => $ceo->employee_id,
                    'position' => 'CEO',
                ],
            ];
        }

        return $flow;
    }

    private function existsInHierarchy($hierarchy, $managerId)
    {
        foreach ($hierarchy as $level) {
            if ($level['manager']['id'] === $managerId) {
                return true;
            }
        }
        return false;
    }
}