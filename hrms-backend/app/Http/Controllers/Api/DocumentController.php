<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = EmployeeDocument::with(['employee', 'category', 'uploader']);

        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        $documents = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json([
            'status' => 'success',
            'data' => $documents,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'category_id' => 'required|exists:document_categories,id',
            'title' => 'required|string|max:255',
            'document' => 'required|file|max:10240', // 10MB max
            'expiry_date' => 'nullable|date',
        ]);

        $file = $request->file('document');
        $path = $file->store('employee-documents/' . $request->employee_id, 'public');

        $document = EmployeeDocument::create([
            'employee_id' => $request->employee_id,
            'category_id' => $request->category_id,
            'title' => $request->title,
            'description' => $request->description,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'expiry_date' => $request->expiry_date,
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Document uploaded successfully',
            'data' => $document->load(['employee', 'category', 'uploader']),
        ], 201);
    }

    public function download(EmployeeDocument $document)
    {
        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json([
                'status' => 'error',
                'message' => 'File not found',
            ], 404);
        }

        return Storage::disk('public')->download(
            $document->file_path,
            $document->file_name
        );
    }

    public function destroy(EmployeeDocument $document)
    {
        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Document deleted successfully',
        ]);
    }
}