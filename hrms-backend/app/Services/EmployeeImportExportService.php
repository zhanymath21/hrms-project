<?php
// app/Services/EmployeeImportExportService.php

namespace App\Services;

use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Color;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Exception;

class EmployeeImportExportService
{
    /**
     * Generate employee ID
     */
    public function generateEmployeeId(): string
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

    /**
     * Create import template
     */
    public function createTemplate(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Employee Template');

        // Headers
        $headers = [
            'A1' => 'First Name*',
            'B1' => 'Last Name*',
            'C1' => 'Email*',
            'D1' => 'Phone',
            'E1' => 'Department*',
            'F1' => 'Position*',
            'G1' => 'Employment Type*',
            'H1' => 'Status*',
            'I1' => 'Hire Date (YYYY-MM-DD)*',
            'J1' => 'Salary',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Style headers
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A73E8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ];
        $sheet->getStyle('A1:J1')->applyFromArray($headerStyle);

        // Example data
        $exampleData = [
            'John',
            'Doe',
            'john.doe@company.com',
            '08123456789',
            'IT',
            'Developer',
            'full_time',
            'active',
            '2024-01-01',
            '5000000'
        ];
        $col = 'A';
        foreach ($exampleData as $value) {
            $sheet->setCellValue($col . '2', $value);
            $col++;
        }

        // Auto-size columns
        foreach (range('A', 'J') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $spreadsheet;
    }

    /**
     * Process import file
     */
    public function processImport(UploadedFile $file): array
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        // Remove header
        array_shift($rows);

        $successCount = 0;
        $failCount = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                $data = [
                    'first_name' => $row[0] ?? null,
                    'last_name' => $row[1] ?? null,
                    'email' => $row[2] ?? null,
                    'phone' => $row[3] ?? null,
                    'department' => $row[4] ?? null,
                    'position' => $row[5] ?? null,
                    'employment_type' => $row[6] ?? null,
                    'status' => $row[7] ?? null,
                    'hire_date' => $row[8] ?? null,
                    'salary' => $row[9] ?? null,
                ];

                // Validate required fields
                if (
                    empty($data['first_name']) || empty($data['last_name']) ||
                    empty($data['email']) || empty($data['department']) ||
                    empty($data['position']) || empty($data['hire_date'])
                ) {
                    $errors[] = "Row " . ($index + 2) . ": Missing required fields";
                    $failCount++;
                    continue;
                }

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

                // Create employee
                Employee::create([
                    'employee_id' => $this->generateEmployeeId(),
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'email' => $data['email'],
                    'phone' => $data['phone'] ?? null,
                    'department_id' => $department->id,
                    'position_id' => $position->id,
                    'employment_type' => $data['employment_type'] ?? 'full_time',
                    'status' => $data['status'] ?? 'active',
                    'hire_date' => $data['hire_date'],
                    'salary' => $data['salary'] ?? 0,
                ]);

                $successCount++;
            } catch (Exception $e) {
                $failCount++;
                $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
                Log::error('Import row error: ' . $e->getMessage());
            }
        }

        return [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors,
        ];
    }

    /**
     * Create export file
     */
    public function createExport($employees, array $filters = []): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Employees');

        // Title
        $sheet->mergeCells('A1:K1');
        $sheet->setCellValue('A1', 'EMPLOYEE LIST REPORT');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1A73E8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Filter info
        $row = 3;
        $filterTexts = [];
        if (!empty($filters['start_date']) || !empty($filters['end_date'])) {
            $filterTexts[] = 'Period: ' . ($filters['start_date'] ?? '...') . ' → ' . ($filters['end_date'] ?? '...');
        }
        if (!empty($filters['status'])) {
            $filterTexts[] = 'Status: ' . ucfirst($filters['status']);
        }
        if (!empty($filters['employment_type'])) {
            $filterTexts[] = 'Type: ' . str_replace('_', ' ', $filters['employment_type']);
        }
        if (!empty($filterTexts)) {
            $sheet->mergeCells("A{$row}:K{$row}");
            $sheet->setCellValue("A{$row}", 'Filters: ' . implode(' | ', $filterTexts));
            $sheet->getStyle("A{$row}")->getFont()->setItalic(true)->setSize(10)->setColor(new Color('666666'));
            $row++;
        }

        // Export info
        $sheet->mergeCells("A{$row}:K{$row}");
        $sheet->setCellValue("A{$row}", 'Exported: ' . now()->format('d M Y H:i') . ' | Total: ' . $employees->count());
        $sheet->getStyle("A{$row}")->getFont()->setSize(9)->setColor(new Color('999999'));
        $row += 2;

        // Headers
        $headers = [
            'A' => 'No',
            'B' => 'Employee ID',
            'C' => 'First Name',
            'D' => 'Last Name',
            'E' => 'Email',
            'F' => 'Phone',
            'G' => 'Department',
            'H' => 'Position',
            'I' => 'Employment Type',
            'J' => 'Status',
            'K' => 'Hire Date',
        ];

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A73E8']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
        ];

        foreach ($headers as $col => $header) {
            $sheet->setCellValue($col . $row, $header);
            $sheet->getStyle($col . $row)->applyFromArray($headerStyle);
        }
        $sheet->getRowDimension($row)->setRowHeight(22);
        $row++;

        // Data
        $statusColors = [
            'active' => 'C6EFCE',
            'inactive' => 'FFC7CE',
            'suspended' => 'FFEB9C',
            'terminated' => 'FFC7CE',
            'resigned' => 'FFEB9C',
        ];

        foreach ($employees as $index => $employee) {
            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $employee->employee_id);
            $sheet->setCellValue('C' . $row, $employee->first_name);
            $sheet->setCellValue('D' . $row, $employee->last_name);
            $sheet->setCellValue('E' . $row, $employee->email);
            $sheet->setCellValue('F' . $row, $employee->phone ?? '-');
            $sheet->setCellValue('G' . $row, $employee->department->name ?? '-');
            $sheet->setCellValue('H' . $row, $employee->position->title ?? '-');
            $sheet->setCellValue('I' . $row, str_replace('_', ' ', $employee->employment_type ?? '-'));
            $sheet->setCellValue('J' . $row, ucfirst($employee->status ?? '-'));
            $sheet->setCellValue('K' . $row, $employee->hire_date ? date('d M Y', strtotime($employee->hire_date)) : '-');

            // Status coloring
            if (isset($statusColors[$employee->status])) {
                $sheet->getStyle('J' . $row)->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $statusColors[$employee->status]]]
                ]);
            }

            $sheet->getRowDimension($row)->setRowHeight(18);
            $row++;
        }

        // Auto-size columns
        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $spreadsheet;
    }

    /**
     * Save spreadsheet to file and return path
     */
    public function saveSpreadsheet(Spreadsheet $spreadsheet, string $fileName): string
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

    /**
     * Get file name for export
     */
    public function getExportFileName(string $prefix = 'Employees'): string
    {
        return $prefix . '_Export_' . now()->format('Ymd_His') . '.xlsx';
    }

    /**
     * Get file name for template
     */
    public function getTemplateFileName(): string
    {
        return 'Employee_Import_Template.xlsx';
    }
}
