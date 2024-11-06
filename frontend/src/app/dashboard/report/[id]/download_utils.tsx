export const downloadCSV = (data: any[]) => {
    if (data.length === 0) {
      return;
    }
  
    const csvHeaders = Object.keys(data[0]).join(",");
    const csvRows = data.map(row => {
      return Object.values(row).join(",");
    });
  
    const csvContent = [csvHeaders, ...csvRows].join("\n");
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  