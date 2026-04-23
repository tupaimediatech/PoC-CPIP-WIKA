<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MaterialController extends Controller
{
    /**
     * GET /materials
     *
     * Returns rows shaped for the Database Material page table:
     * { id, id_material, nama_material, kategori_material, project_name, project_id }
     *
     * Optional filters: material_id (LIKE), material_name (LIKE),
     * material_category (exact), project_name (exact).
     */
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('project_work_items as pwi')
            ->join('project_wbs as pw', 'pw.id', '=', 'pwi.period_id')
            ->join('projects as p', 'p.id', '=', 'pw.project_id')
            ->whereNotNull('pwi.id_material')
            ->where('pwi.is_total_row', false)
            ->select([
                'pwi.id',
                'pwi.id_material as material_id',
                'pwi.item_name as material_name',
                'pwi.material_category',
                'p.project_name',
                'p.id as project_id',
            ])
            ->orderBy('p.project_name')
            ->orderBy('pwi.id_material');

        if ($request->filled('material_id')) {
            $query->where('pwi.id_material', 'like', '%' . $request->input('material_id') . '%');
        }
        if ($request->filled('material_name')) {
            $query->where('pwi.item_name', 'like', '%' . $request->input('material_name') . '%');
        }
        if ($request->filled('material_category')) {
            $query->where('pwi.material_category', $request->input('material_category'));
        }
        if ($request->filled('project_name')) {
            $query->where('p.project_name', $request->input('project_name'));
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * GET /materials/filter-options
     *
     * Returns { material_category: string[], project_name: string[] } for dropdowns.
     */
    public function filterOptions(): JsonResponse
    {
        $categories = DB::table('project_work_items')
            ->whereNotNull('material_category')
            ->where('material_category', '!=', '')
            ->where('is_total_row', false)
            ->distinct()
            ->orderBy('material_category')
            ->pluck('material_category');

        $projects = DB::table('projects')
            ->whereNotNull('project_name')
            ->where('project_name', '!=', '')
            ->distinct()
            ->orderBy('project_name')
            ->pluck('project_name');

        return response()->json([
            'material_category' => $categories,
            'project_name'      => $projects,
        ]);
    }
}
