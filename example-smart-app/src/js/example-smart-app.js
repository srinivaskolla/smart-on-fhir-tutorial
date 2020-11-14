(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      $( "#fromDate" ).datepicker();
      $( "#toDate" ).datepicker(); 
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9', 'http://loinc.org|59408-5',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4', 'http://loinc.org|3141-9'
                        ]
                      }
                    }
                  });

        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, obv) { 
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          window.__obv = (obv);
          window.__myByCodes = byCodes;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2'); 
          var spO2 = byCodes("59408-5"); 
          var systolicbp = getBloodPressure(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressure(byCodes('55284-4'),'8462-4');
		  
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  function getBloodPressure(BPObservations, typeOfPressure) {
    var formattedBPObservations = []; 
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        var bpObj  = getQuantityValueAndUnit(observation); 
        formattedBPObservations.push(bpObj);
      }
    });

    return  formattedBPObservations;
  }

  function getQuantityValueAndUnit(ob) {
    var obj = {};
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
        obj.val = ob.valueQuantity.value;
        obj.unit = ob.valueQuantity.unit; 
	obj.ts = new Date(ob.effectiveDateTime).getTime();
	// obj.low =  
        return obj;
    } else {
      return null;
    }
  }

	function flotToolTip(catg, x, y)
	{ 
		  var d = new Date(x);
		  var dt = $.datepicker.formatDate("mm/dd/yy", d);
		  var h = padZero(d.getHours(), 2);
		  var m = padZero(d.getMinutes(), 2); 
		 // var s = padZero(d.getSeconds(), 2);
		  dt += " " +  h + ":" + m ;  
		  var dh = "<div class='" + catg.toLowerCase().trim() + "'></div><span>" + catg + "   " + y + "</span>"; 
		  return ("<div class='tth'>" + dt + "</div>" + dh  );
	}

  function padZero(number, length)
  {
    var str = '' + number;
    while (str.length < length) {
      str = '0' + str;
    } 
    return str;
  } 

  function drawVitalSignsChart(p)
  {
	var nd1 = []; 
	$.each(p.systolicbp, function(i, obj){
	   nd1.push( [obj.ts , obj.val] );
	}); 

	var nd2 = [];
	$.each(p.diastolicbp, function(i, obj){
	   nd2.push( [obj.ts, obj.val] );
	});
    
	var flot_options = {
		series: {
			lines: { show: true, lineWidth: 1 },
			points: { show: true }
		}, 
		xaxis: { mode: "time" },
		grid: { hoverable: true, clickable: true },
		tooltip: { show: true, content: flotToolTip  },
		ticks: { showTickLabels: true }
	};

	var dataArr = [
		{ data: nd1, label: "Systloic ", lines: { show: true  }, color: "#edc240"},
		{ data: nd2, label: "Diastolic ", lines: { show: true }, color: "#afd8f8"}
	];

	$.plot("#rtvAdvChart", dataArr, flot_options);
  }

  window.drawVisualization = function(p) 
  {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height); 
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    drawVitalSignsChart(p);
  };

})(window);
