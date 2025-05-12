export default `
<div id="dashboardView">
  <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
    <div class="d-flex align-items-center flex-wrap gap-2">
      <select id="branchSelect" class="form-select w-auto"></select>
      <input id="monthSelect" type="month" class="form-control w-auto">
      <button id="refreshBtn" class="btn btn-outline-secondary btn-sm" title="Refresh">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </div>
    <button id="newDcrBtn" class="btn btn-success btn-sm">
      <i class="bi bi-plus-circle me-1"></i> New DCR
    </button>
  </div>
  <div class="table-responsive">
    <table class="table table-sm table-hover" id="dcrTable">
      <thead class="table-light">
        <tr>
          <th>Date</th>
          <th>DCR #</th>
          <th>Status</th>
          <th style="width:120px">Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
</div>
`;