<?php
// app/Services/EmployeeImportExportService.php

namespace App\Services;

use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class EmployeeImportExportService
{
    public function processImport(UploadedFile $file): array
    {
        Log::info('📤 Starting employee import...');

        try {
            $spreadsheet = IOFactory::load($file);
        } catch (\Exception $e) {
            Log::error('❌ Failed to load file: ' . $e->getMessage());
            return [
                'success_count' => 0,
                'fail_count' => 1,
                'errors' => ['Failed to read file: ' . $e->getMessage()]
            ];
        }

        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        if (empty($rows) || count($rows) < 2) {
            return [
                'success_count' => 0,
                'fail_count' => 1,
                'errors' => ['File is empty.']
            ];
        }

        // Remove header
        array_shift($rows);

        $successCount = 0;
        $failCount = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                // Skip empty rows
                if (empty(array_filter($row))) {
                    continue;
                }

                // Extract data
                $data = [
                    'first_name' => trim($row[0] ?? ''),
                    'last_name' => trim($row[1] ?? ''),
                    'email' => trim($row[2] ?? ''),
                    'password' => trim($row[3] ?? 'password123'),
                    'hire_date' => trim($row[9] ?? ''),
                    'department' => trim($row[11] ?? ''),
                    'position' => trim($row[12] ?? ''),
                    'employment_type' => trim($row[14] ?? 'full_time'),
                    'status' => trim($row[15] ?? 'active'),
                ];

                Log::info('📝 Row ' . ($index + 2) . ':', $data);

                // Check required fields
                if (
                    empty($data['first_name']) || empty($data['last_name']) ||
                    empty($data['email']) || empty($data['hire_date']) ||
                    empty($data['department']) || empty($data['position'])
                ) {
                    $errors[] = "Row " . ($index + 2) . ": Missing required fields";
                    $failCount++;
                    continue;
                }

                // Check if employee exists
                if (Employee::where('email', $data['email'])->exists()) {
                    $errors[] = "Row " . ($index + 2) . ": Email already exists";
                    $failCount++;
                    continue;
                }

                DB::beginTransaction();

                // Find or create department
                $department = Department::firstOrCreate(
                    ['name' => $data['department']],
                    ['code' => strtoupper(substr($data['department'], 0, 3))]
                );

                // Find or create position
                $position = Position::firstOrCreate(
                    ['title' => $data['position']],
                    ['department_id' => $department->id]
                );

                // Generate employee ID
                $employeeId = $this->generateEmployeeId();

                // Create employee
                Employee::create([
                    'employee_id' => $employeeId,
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'email' => $data['email'],
                    'password' => bcrypt($data['password']),
                    'hire_date' => $data['hire_date'],
                    'department_id' => $department->id,
                    'position_id' => $position->id,
                    'employment_type' => $data['employment_type'],
                    'status' => $data['status'],
                ]);

                DB::commit();
                $successCount++;
                Log::info('✅ Row ' . ($index + 2) . ' imported successfully');
            } catch (\Exception $e) {
                DB::rollBack();
                $failCount++;
                $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
                Log::error('❌ Row ' . ($index + 2) . ' error: ' . $e->getMessage());
            }
        }

        Log::info('✅ Import completed - Success: ' . $successCount . ', Failed: ' . $failCount);

        return [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors,
        ];
    }

    private function generateEmployeeId(): string
    {
        $year = date('Y');
        $lastEmployee = Employee::where('employee_id', 'like', "EMP-{$year}-%")
            ->orderBy('employee_id', 'desc')
            ->first();

        if ($lastEmployee) {
            $lastNumber = intval(substr($lastEmployee->employee_id, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "EMP-{$year}-{$newNumber}";
    }

    public function createTemplate(): Spreadsheet
    {
        // ... simplified template ...
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'First Name*');
        $sheet->setCellValue('B1', 'Last Name*');
        $sheet->setCellValue('C1', 'Email*');
        $sheet->setCellValue('D1', 'Password*');
        $sheet->setCellValue('E1', 'Phone');
        $sheet->setCellValue('F1', 'Date of Birth');
        $sheet->setCellValue('G1', 'Gender');
        $sheet->setCellValue('H1', 'National ID');
        $sheet->setCellValue('I1', 'Address');
        $sheet->setCellValue('J1', 'Hire Date (YYYY-MM-DD)*');
        $sheet->setCellValue('K1', 'Probation End Date');
        $sheet->setCellValue('L1', 'Department*');
        $sheet->setCellValue('M1', 'Position*');
        $sheet->setCellValue('N1', 'Default Office');
        $sheet->setCellValue('O1', 'Employment Type*');
        $sheet->setCellValue('P1', 'Status*');
        $sheet->setCellValue('Q1', 'Employment Status');
        $sheet->setCellValue('R1', 'Salary');
        $sheet->setCellValue('S1', 'Manager Email');
        $sheet->setCellValue('T1', 'Emergency Contact Name');
        $sheet->setCellValue('U1', 'Emergency Contact Phone');
        $sheet->setCellValue('V1', 'Emergency Contact Relation');
        $sheet->setCellValue('W1', 'Card Number');
        $sheet->setCellValue('X1', 'Card Type');
        $sheet->setCellValue('Y1', 'Use Card (YES/NO)');

        // Example data
        $sheet->setCellValue('A2', 'John');
        $sheet->setCellValue('B2', 'Doe');
        $sheet->setCellValue('C2', 'john@test.com');
        $sheet->setCellValue('D2', 'password123');
        $sheet->setCellValue('J2', date('Y-m-d'));
        $sheet->setCellValue('L2', 'Information Technology');
        $sheet->setCellValue('M2', 'Developer');
        $sheet->setCellValue('O2', 'full_time');
        $sheet->setCellValue('P2', 'active');

        return $spreadsheet;
    }

    public function saveSpreadsheet($spreadsheet, string $fileName): string
    {
        $tempDir = storage_path('app/temp');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $filePath = $tempDir . '/' . $fileName;
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);

        return $filePath;
    }

    public function getTemplateFileName(): string
    {
        return 'Employee_Import_Template.xlsx';
    }
}
