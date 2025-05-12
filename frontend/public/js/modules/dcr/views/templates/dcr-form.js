export default `
<div class="modal-header">
  <h5 class="modal-title">{{title}}</h5>
  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
</div>
<div class="modal-body">
  <form id="dcrForm" class="row g-3">{{{formGroups}}}</form>
</div>
<div class="modal-footer">
  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
  <button type="button" id="saveDcrBtn" class="btn btn-primary">Save</button>
</div>
`;