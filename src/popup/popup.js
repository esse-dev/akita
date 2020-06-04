const ctx = document.getElementById('myChart').getContext('2d');
// chart.js getting started: https://www.chartjs.org/docs/latest/getting-started/
const myLineChart = new Chart(ctx, {
  type: 'line',
	data: {
    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    datasets: [{
        label: 'My First dataset',
        backgroundColor: 'rgb(255, 99, 132)',
        borderColor: 'rgb(255, 99, 132)',
        data: [0, 10, 5, 2, 20, 30, 45]
    }]
  },
  options: {
    responsive:true,
    layout:{
      padding:{
        top:12,
        left:12,
        bottom:12
      },
    },
    scales: {
      xAxes:[{
        gridLines:{borderDash:[],},
      }],
      yAxes:[{
        gridLines:{borderDash:[],},
      }],
    }
  }
});