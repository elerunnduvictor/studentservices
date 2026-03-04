OC.initToolbar = function() {
  // Expand All
  document.getElementById('expandAll').addEventListener('click', function() {
    document.querySelectorAll('.tile').forEach(function(t) { t.classList.add('expanded'); });
  });

  // Collapse All
  document.getElementById('collapseAll').addEventListener('click', function() {
    document.querySelectorAll('.tile').forEach(function(t) { t.classList.remove('expanded'); });
  });

  // Print
  document.getElementById('printBtn').addEventListener('click', function() {
    document.querySelectorAll('.tile').forEach(function(t) { t.classList.add('expanded'); });
    setTimeout(function() { window.print(); }, 200);
  });

  // PDF Export
  document.getElementById('exportPdf').addEventListener('click', function() {
    document.body.classList.add('pdf-mode');
    document.querySelectorAll('.tile').forEach(function(t) { t.classList.add('expanded'); });

    var header = document.querySelector('.page-header');
    var chart = document.getElementById('chartContainer');

    var wrapper = document.createElement('div');
    wrapper.style.background = '#FFFFFF';
    wrapper.style.padding = '20px';
    wrapper.appendChild(header.cloneNode(true));
    wrapper.appendChild(chart.cloneNode(true));
    document.body.appendChild(wrapper);

    var opt = {
      margin: 0.3,
      filename: 'Student_Services_Org_Chart.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
      jsPDF: { unit: 'in', format: 'a2', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all'] }
    };

    window.html2pdf().set(opt).from(wrapper).save().then(function() {
      document.body.removeChild(wrapper);
      document.body.classList.remove('pdf-mode');
    });
  });
};
