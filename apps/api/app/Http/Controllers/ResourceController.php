<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ResourceController extends Controller
{
    /**
     * GET /resources
     *
     * Returns rows shaped for the Database Resource page table.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('project_work_items as pwi')
            ->join('project_wbs as pw', 'pw.id', '=', 'pwi.period_id')
            ->join('projects as p', 'p.id', '=', 'pw.project_id')
            ->whereNotNull('pwi.id_resource')
            ->where('pwi.is_total_row', false)
            ->select([
                'pwi.id',
                'pwi.id_resource as resource_id',
                'pwi.item_name as resource_name',
                'pwi.resource_category as resource_category',
                'p.project_name',
                'p.location',
                'p.project_year as year',
            ])
            ->orderBy('p.project_name')
            ->orderBy('pwi.id_resource');

        if ($request->filled('resource_id')) {
            $query->where('pwi.id_resource', 'like', '%' . $request->query('resource_id') . '%');
        }

        if ($request->filled('resource_name')) {
            $query->where('pwi.item_name', 'like', '%' . $request->query('resource_name') . '%');
        }

        if ($request->filled('resource_category')) {
            $query->where('pwi.resource_category', $request->query('resource_category'));
        }

        if ($request->filled('project_name')) {
            $query->where('p.project_name', $request->query('project_name'));
        }

        if ($request->filled('location')) {
            $query->where('p.location', $request->query('location'));
        }

        if ($request->filled('year')) {
            $query->where('p.project_year', (int) $request->query('year'));
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * GET /resources/filter-options
     */
    public function filterOptions(): JsonResponse
    {
        $resourceCategories = DB::table('project_work_items')
            ->whereNotNull('id_resource')
            ->whereNotNull('resource_category')
            ->where('resource_category', '!=', '')
            ->where('is_total_row', false)
            ->distinct()
            ->orderBy('resource_category')
            ->pluck('resource_category');

        $projects = DB::table('project_work_items as pwi')
            ->join('project_wbs as pw', 'pw.id', '=', 'pwi.period_id')
            ->join('projects as p', 'p.id', '=', 'pw.project_id')
            ->whereNotNull('pwi.id_resource')
            ->whereNotNull('p.project_name')
            ->where('p.project_name', '!=', '')
            ->where('pwi.is_total_row', false)
            ->distinct()
            ->orderBy('p.project_name')
            ->pluck('p.project_name');

        $locations = DB::table('project_work_items as pwi')
            ->join('project_wbs as pw', 'pw.id', '=', 'pwi.period_id')
            ->join('projects as p', 'p.id', '=', 'pw.project_id')
            ->whereNotNull('pwi.id_resource')
            ->whereNotNull('p.location')
            ->where('p.location', '!=', '')
            ->where('pwi.is_total_row', false)
            ->distinct()
            ->orderBy('p.location')
            ->pluck('p.location');

        $years = DB::table('project_work_items as pwi')
            ->join('project_wbs as pw', 'pw.id', '=', 'pwi.period_id')
            ->join('projects as p', 'p.id', '=', 'pw.project_id')
            ->whereNotNull('pwi.id_resource')
            ->whereNotNull('p.project_year')
            ->where('pwi.is_total_row', false)
            ->distinct()
            ->orderByDesc('p.project_year')
            ->pluck('p.project_year');

        return response()->json([
            'resource_category' => $resourceCategories,
            'project_name'      => $projects,
            'location'          => $locations,
            'year'              => $years,
        ]);
    }
}
