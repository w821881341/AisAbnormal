/**
 * This javascript module handles loading, processing, display and user interaction with maps and layers.
 */

var mapModule = {

    map: null,

    isGridLayerVisible: false,
    isVesselLayerVisible: false,

    projectionWGS84: null,
    projectionSphericalMercator: null,
    projectionWebMercator: null,

    kmlResourceService: "http://" + document.location.hostname + "/store/scenario",

    init: function() {
        $('#map-enable-nautical-charts').submit(
            function( event ) {
                event.preventDefault();

                var gstUsername = $('#map-gst-username').val();
                if (! gstUsername) {
                    alert("Please provide a username to display nautical charts.");
                    return;
                }

                var gstPassword = $('#map-gst-password').val();
                if (! gstPassword) {
                    alert("Please provide a password to display nautical charts.");
                    return;
                }

                mapModule.addNauticalLayers(gstUsername, gstPassword);
            }
        );

        mapModule.projectionWGS84 = new OpenLayers.Projection("EPSG:4326");
        mapModule.projectionSphericalMercator = new OpenLayers.Projection("EPSG:900913");
        mapModule.projectionWebMercator = new OpenLayers.Projection("EPSG:3857");

        mapModule.map = new OpenLayers.Map("map");
        mapModule.map.addLayer(new OpenLayers.Layer.OSM());

        var zoom = new OpenLayers.Control.Zoom();
        mapModule.map.addControl(zoom);
        zoom.activate();

        mapModule.map.addControl(new OpenLayers.Control.LayerSwitcher());

        mapModule.constructGridLayer();
        mapModule.constructVesselLayer();

        mapModule.initContextMenu();

        mapModule.registerEventHandlers();
        mapModule.zoomToDenmark();
    },

    onKmlGenModalLoaded: function() {
        $('button#kmlgen-event').click(mapModule.generateKmlForEvent);
        $('input#kmlgen-event-from').blur(mapModule.validateKmlUserInput);
        $('input#kmlgen-event-to').blur(mapModule.validateKmlUserInput);
        $('input#kmlgen-event-north').blur(mapModule.validateKmlUserInput);
        $('input#kmlgen-event-east').blur(mapModule.validateKmlUserInput);
        $('input#kmlgen-event-south').blur(mapModule.validateKmlUserInput);
        $('input#kmlgen-event-west').blur(mapModule.validateKmlUserInput);
    },

    nauticalLayers: null,

    removeNauticalLayers: function () {
        if (mapModule.nauticalLayers) {
            for (var key in mapModule.nauticalLayers) {
                try {
                    mapModule.map.removeLayer(mapModule.nauticalLayers[key]);
                } catch (e) {
                }
            }
        }
    },

    addNauticalLayers: function (gstUsername, gstPassword) {
        mapModule.removeNauticalLayers();

        var url = "http://kortforsyningen.kms.dk/";
        mapModule.nauticalLayers = {
            200: new OpenLayers.Layer.WMS("Default", url, {
                layers: 'cells',
                servicename: 'soe_enc',
                transparent: 'true',
                styles: 'default',
                login: gstUsername,
                password: gstPassword
            }, {
                isBaseLayer: false,
                visibility: true,
                projection: 'EPSG:3857'
            }),
            261: new OpenLayers.Layer.WMS("Base with paper chart symbols", url, {
                layers: 'cells',
                servicename: 'soe_enc',
                transparent: 'true',
                styles: 'default',
                login: gstUsername,
                password: gstPassword
            }, {
                isBaseLayer: false,
                visibility: false,
                projection: 'EPSG:3857'
            }),
            245: new OpenLayers.Layer.WMS("Full with paper chart symbols", url, {
                layers: 'cells',
                servicename: 'soe_enc',
                transparent: 'true',
                styles: 'default',
                login: gstUsername,
                password: gstPassword
            }, {
                isBaseLayer: false,
                visibility: false,
                projection: 'EPSG:3857'
            }),
            260: new OpenLayers.Layer.WMS("Full with ECDIS chart symbols", url, {
                layers: 'cells',
                servicename: 'soe_enc',
                transparent: 'true',
                styles: 'default',
                login: gstUsername,
                password: gstPassword
            }, {
                isBaseLayer: false,
                visibility: false,
                projection: 'EPSG:3857'
            }),
            246: new OpenLayers.Layer.WMS("Standard with paper chart symbols",
                url, {
                    layers: 'cells',
                    servicename: 'soe_enc',
                    transparent: 'true',
                    styles: 'default',
                    login: gstUsername,
                    password: gstPassword
                }, {
                    isBaseLayer: false,
                    visibility: false,
                    projection: 'EPSG:3857'
                })
        };
        for (var key in mapModule.nauticalLayers) {
            mapModule.map.addLayer(mapModule.nauticalLayers[key]);
            mapModule.map.setLayerIndex(mapModule.nauticalLayers[key], 1);
        }
        mapModule.map.setLayerIndex(mapModule.getGridLayer(), 98);
        mapModule.map.setLayerIndex(mapModule.getVesselLayer(), 99);
    },

    kmlGenPrimaryMmsisForEvent: function(jsonEvent) {
        var primaryMmsis = new Array();

        var behaviours = jsonEvent.behaviours;
        var n = behaviours.length;
        for (var i=0; i<n; i++) {
            if (behaviours[i].primary == true) {
                primaryMmsis.push(jsonEvent.behaviours[i].vessel.mmsi);
            }
        }

        return primaryMmsis;
    },

    kmlGenSecondaryMmsisForEvent: function(jsonEvent) {
        var secondaryMmsis = new Array();
        switch (jsonEvent.eventType) {
            case "CloseEncounterEvent":
                var behaviours = jsonEvent.behaviours;
                var n = behaviours.length;
                for (var i=0; i<n; i++) {
                    if (behaviours[i].primary == false) {
                        secondaryMmsis.push(jsonEvent.behaviours[i].vessel.mmsi);
                    }
                }
                break;
            default:
        }
        return secondaryMmsis;
    },

    kmlGenStartTimeForEvent: function(jsonEvent) {
        return new Date(jsonEvent.startTime - 15 * 60 * 1000 /* 15 minutes before */);
    },

    kmlGenEndTimeForEvent: function(jsonEvent) {
        if (jsonEvent.endTime) {
            return new Date(jsonEvent.endTime + 10 * 60 * 1000 /* 10 minutes after */);
        } else {
            return new Date(jsonEvent.startTime + 20 * 60 * 1000 /* 20 minutes after beginning */);
        }
    },

    kmlGenTitleForEvent: function(jsonEvent) {
        return '[' + jsonEvent.id + '] ' + jsonEvent.title;
    },

    kmlGenDescriptionForEvent: function(jsonEvent) {
        return jsonEvent.description;
    },

    openExportToKmlModal: function (title, description, primaryMmsi, secondaryMmsi, from, to, snapshotAt, boundaryNorth, boundaryEast, boundarySouth, boundaryWest) {
        var modal = $('#event-kmlgen-modal');

        modal.find('#kmlgen-event-title').val(title);
        modal.find('#kmlgen-event-description').val(description);
        modal.find('#kmlgen-event-primary-mmsis').val(primaryMmsi);
        modal.find('#kmlgen-event-secondary-mmsis').val(secondaryMmsi);

        modal.find('#kmlgen-event-from').val(from.toISOString());
        modal.find('#kmlgen-event-to').val(to.toISOString());
        modal.find('#kmlgen-event-situation-at').val(snapshotAt);

        modal.find('#kmlgen-event-north').val(boundaryNorth);
        modal.find('#kmlgen-event-east').val(boundaryEast);
        modal.find('#kmlgen-event-south').val(boundarySouth);
        modal.find('#kmlgen-event-west').val(boundaryWest);

        modal.modal({});

        $('div#kmlgen-warning').hide();
        mapModule.validateKmlUserInput();
    },

    initContextMenu: function() {
        var contextMenuDef = [
            {'Name': {disabled:true} },
            {'IMO': {disabled:true} },
            {'MMSI': {disabled:true}},
            {'Callsign': {disabled:true} },
            $.contextMenu.separator,
            {'Export for Google Earth ...':function(menuItem,menu) {
                var evt = menu.originalEvent;
                var feature = mapModule.getVesselLayer().getFeatureFromEvent(evt);
                var primaryMmsis = mapModule.kmlGenPrimaryMmsisForEvent(feature.data.jsonEvent);
                var secondaryMmsis = mapModule.kmlGenSecondaryMmsisForEvent(feature.data.jsonEvent);
                var bounds = feature.geometry.bounds.clone();

                /* Ensure exported area at least 5 km x 5 km */
                var minimumBoundsWidthMeters = 5000;
                var minimumBoundsHeightMeters = 5000;
                var boundsWidthMeters = bounds.right - bounds.left;
                var boundsHeightMeters = bounds.top - bounds.bottom;
                if (boundsWidthMeters < minimumBoundsHeightMeters) {
                    var missingWidthMeters = minimumBoundsWidthMeters - boundsWidthMeters;
                    bounds.left = bounds.left - missingWidthMeters/2;
                    bounds.right = bounds.right + missingWidthMeters/2;
                }
                if (boundsHeightMeters < minimumBoundsHeightMeters) {
                    var missingHeightMeters = minimumBoundsHeightMeters - boundsHeightMeters;
                    bounds.bottom = bounds.bottom - missingHeightMeters/2;
                    bounds.top = bounds.top + missingHeightMeters/2;
                }

                console.log("Bounds - " + bounds.getSize().h + " x " + bounds.getSize().w);

                bounds.transform(mapModule.projectionSphericalMercator, mapModule.projectionWGS84);

                mapModule.openExportToKmlModal(
                    mapModule.kmlGenTitleForEvent(feature.data.jsonEvent),
                    mapModule.kmlGenDescriptionForEvent(feature.data.jsonEvent),
                    primaryMmsis.join(", "),
                    secondaryMmsis.join(", "),
                    mapModule.kmlGenStartTimeForEvent(feature.data.jsonEvent),
                    mapModule.kmlGenEndTimeForEvent(feature.data.jsonEvent),
                    new Date(feature.data.jsonEvent.startTime).toISOString(),
                    OpenLayers.Util.getFormattedLonLat(bounds.top, 'lat'),
                    OpenLayers.Util.getFormattedLonLat(bounds.right, 'lon'),
                    OpenLayers.Util.getFormattedLonLat(bounds.bottom, 'lat'),
                    OpenLayers.Util.getFormattedLonLat(bounds.left, 'lon')
                );
            }},
            $.contextMenu.separator,
            {'Show on VesselFinder.com ...':function(menuItem,menu) {
                var evt = menu.originalEvent;
                var feature = mapModule.getVesselLayer().getFeatureFromEvent(evt);
                if (feature && feature.fid && feature.fid.match("^trackSymbol")) {
                    var imo = feature.data.imo;
                    if (imo) {
                        var url = "http://www.vesselfinder.com/?imo=" + imo;
                        window.open(url, '_blank');
                    } else {
                        alert("Sorry cannot lookup on VesselFinder.com because IMO no. is unknown.");
                    }
                }
            }},
            {'Show on MarineTraffic.com ...':function(menuItem,menu) {
                var evt = menu.originalEvent;
                var feature = mapModule.getVesselLayer().getFeatureFromEvent(evt);
                if (feature && feature.fid && feature.fid.match("^trackSymbol")) {
                    var mmsi = feature.data.mmsi;
                    if (mmsi) {
                        var url = "http://www.marinetraffic.com/en/ais/details/ships/" + mmsi;
                        window.open(url, '_blank');
                    } else {
                        alert("Sorry cannot lookup on MarineTraffic.com because MMSI no. is unknown.");
                    }
                }
            }}
        ];

        $('div#map').contextMenu(contextMenuDef, {
            theme:'osx',
            beforeShow: function() {
                var feature = mapModule.getVesselLayer().getFeatureFromEvent(this.originalEvent);
                var isTrack = feature && feature.fid && feature.fid.match("^trackSymbol");
                var isEvent = feature && feature.fid && feature.fid.match("^event");

                if (isTrack) {
                    var fid = feature.fid;
                    $('.context-menu-item:nth-child(1)').find('.context-menu-item-inner').html(feature.data.name);
                    $('.context-menu-item:nth-child(2)').find('.context-menu-item-inner').html('IMO: ' + feature.data.imo);
                    $('.context-menu-item:nth-child(3)').find('.context-menu-item-inner').html('MMSI: ' + feature.data.mmsi);
                    $('.context-menu-item:nth-child(4)').find('.context-menu-item-inner').html('C/S: ' + feature.data.callsign);
                    $('.context-menu-item:nth-child(8)').find('.context-menu-item-inner').removeClass('context-menu-item-disabled');
                    $('.context-menu-item:nth-child(9)').find('.context-menu-item-inner').removeClass('context-menu-item-disabled');
                }
                else {
                    $('.context-menu-item:nth-child(1)').find('.context-menu-item-inner').html('Name:');
                    $('.context-menu-item:nth-child(2)').find('.context-menu-item-inner').html('IMO:');
                    $('.context-menu-item:nth-child(3)').find('.context-menu-item-inner').html('MMSI:');
                    $('.context-menu-item:nth-child(4)').find('.context-menu-item-inner').html('C/S:');
                    $('.context-menu-item:nth-child(8)').find('.context-menu-item-inner').addClass('context-menu-item-disabled');
                    $('.context-menu-item:nth-child(9)').find('.context-menu-item-inner').addClass('context-menu-item-disabled');
                }

                if (isEvent) {
                    $('.context-menu-item:nth-child(6)').find('.context-menu-item-inner').removeClass('context-menu-item-disabled');
                } else {
                    $('.context-menu-item:nth-child(6)').find('.context-menu-item-inner').addClass('context-menu-item-disabled');
                }
            }
        });
    },

    zoomTo: function(bounds) {
        var bbox = mapModule.getLatLonBounds(bounds);
        bbox.toBBOX();
        mapModule.map.zoomToExtent(bbox, true);
    },

    zoomToDenmark: function() {
        // set the map centre on the middle of Denmark
        var lat = 56;
        var lon = 12;
        var zoom = 7;
        mapModule.map.setCenter(new OpenLayers.LonLat(lon, lat).transform(this.projectionWGS84, this.projectionSphericalMercator), zoom)
    },

    registerEventHandlers: function () {
        mapModule.map.events.register('move', map, this.onMapMove);
        mapModule.map.events.register('moveend', map, this.onMapMoveEnd);
        mapModule.map.events.register('mousemove', map, this.onMapMouseMove);

        $('#cells-force-load').click(this.onForceLoadCells);
    },

    onMapMove: function (evt) {
        mapModule.userOutputUpdateViewPortInfo();
    },

    onMapMoveEnd: function (evt) {
        if (mapModule.map.zoom >= 12) {
            if (mapModule.isGridLayerVisible == false) {
                console.log("Turning on GridLayer.");
                mapModule.showGridLayer();
            } else {
                statisticsModule.loadCells();
                console.log("GridLayer is already visible.")
            }
        } else {
            console.log("Turning off GridLayer.");
            mapModule.hideGridLayer();
        }
    },

    onMapMouseMove: function (evt) {
        mapModule.userOutputUpdateCursorPos(evt.xy);
    },

    onForceLoadCells: function (evt) {
        mapModule.showGridLayer();
    },

    showGridLayer: function () {
        var gridLayer = mapModule.map.getLayersByName("DMA grid layer")[0];
        if (!gridLayer) {
            mapModule.constructGridLayer();
            gridLayer = mapModule.map.getLayersByName("DMA grid layer")[0];
        }

        // Display grid layer
        if (angular.element($('#CellsControllerElement')).scope().cellsEnable) {
            gridLayer.display(true);
            // Load cells and data (required grid layer to be constructed)
            statisticsModule.loadCells();
            // Book-keeping
            mapModule.isGridLayerVisible = true;
        } else {
            gridLayer.display(false);
        }
    },

    showVesselLayer: function () {
        var vesselLayer = mapModule.map.getLayersByName("DMA vessel layer")[0];
        if (vesselLayer) {
            vesselLayer.display(true);
        } else {
            mapModule.constructVesselLayer();
        }
        mapModule.isVesselLayerVisible = true;
    },

    hideGridLayer: function () {
        var gridLayer = mapModule.map.getLayersByName("DMA grid layer")[0];
        if (gridLayer) {
            gridLayer.display(false);

            // Book-keeping
            mapModule.isGridLayerVisible = false;
        }
    },

    hideVesselLayer: function () {
        var vesselLayer = mapModule.map.getLayersByName("DMA vessel layer")[0];
        if (vesselLayer) {
            vesselLayer.display(false);
            mapModule.isVesselLayerVisible = false;
        }
    },

    getGridLayer: function () {
        return mapModule.map.getLayersByName("DMA grid layer")[0];
    },

    getVesselLayer: function () {
        return mapModule.map.getLayersByName("DMA vessel layer")[0];
    },

    constructGridLayer: function () {
        // allow testing of specific renderers via "?renderer=Canvas", etc
        var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
        renderer = (renderer) ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;

        // we want opaque external graphics and non-opaque internal graphics
        var layerStyle = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
        layerStyle.fillOpacity = 0.2;
        layerStyle.graphicOpacity = 1;

        var gridLayer = new OpenLayers.Layer.Vector("DMA grid layer", {
            style: layerStyle,
            renderers: renderer,
            eventListeners: this.gridLayerFeatureListeners
        });

        mapModule.map.addLayer(gridLayer);
        mapModule.map.setLayerIndex(gridLayer, 98);
    },

    constructVesselLayer: function () {
        var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
        renderer = (renderer) ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;

        var layerStyle = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
        layerStyle.fillOpacity = 0.2;
        layerStyle.graphicOpacity = 1;

        var vesselLayer = new OpenLayers.Layer.Vector("DMA vessel layer", {
            style: layerStyle,
            renderers: renderer,
            rendererOptions: {zIndexing: true},
            eventListeners: this.vesselLayerFeatureListeners
        });

        mapModule.map.addLayer(vesselLayer);
        mapModule.map.setLayerIndex(vesselLayer, 99);
    },

    userOutputUpdateCursorPos: function (screenpos) {
        var cursorPos = this.map.getLonLatFromPixel(screenpos);

        var p = new OpenLayers.Geometry.Point(cursorPos.lon, cursorPos.lat);
        p.transform(this.map.getProjectionObject(), this.projectionWGS84);

        var lat = OpenLayers.Util.getFormattedLonLat(p.y, 'lat');
        var lon = OpenLayers.Util.getFormattedLonLat(p.x, 'lon');

        $('#cursorpos').html("<p>(" + lat + ", " + lon + ")</p>");
    },

    userOutputUpdateViewPortInfo: function () {
        var viewport = mapModule.getCurrentViewportExtent();

        var north = OpenLayers.Util.getFormattedLonLat(viewport.top, 'lat');
        var west = OpenLayers.Util.getFormattedLonLat(viewport.left, 'lon');
        var south = OpenLayers.Util.getFormattedLonLat(viewport.bottom, 'lat');
        var east = OpenLayers.Util.getFormattedLonLat(viewport.right, 'lon');

        $('#viewport').html("<p>(" + north + ", " + west + ")<br/>(" + south + ", " + east + ")</p>");
    },

    getCurrentViewportExtent: function() {
        var viewport = mapModule.map.getExtent();
        viewport.transform(mapModule.map.getProjectionObject(), mapModule.projectionWGS84);
        return viewport;
    },

    getLatLonBounds: function(bounds) {
        var nw = new OpenLayers.LonLat(bounds.left, bounds.top).transform(this.projectionWGS84, this.projectionSphericalMercator);
        var se = new OpenLayers.LonLat(bounds.right, bounds.bottom).transform(this.projectionWGS84, this.projectionSphericalMercator);

        var bbox = new OpenLayers.Bounds();
        bbox.extend(nw);
        bbox.extend(se);

        return bbox;
    },

    gridLayerFeatureListeners: {
        featureclick: function (e) {
            var feature = e.feature;
            var cell = feature.data;

            statisticsModule.userOutputShowCellData(cell);

            return false;
        },
        nofeatureclick: function (e) {
            console.log(e.object.name + " says: No feature clicked.");
        },
        featureover: function (e) {
            // console.log(e.object.name + " says: " + e.feature.id + " hovered.");
        },
        featureout: function (e) {
            // console.log(e.object.name + " says: " + e.feature.id + " left.");
        }
    },

    vesselLayerFeatureListeners: {
        featureclick: function (e) {
            var feature = e.feature;
            var data = feature.data;
            console.info("Logged: " + data);

            return false;
        }
    },

    formattedLatLonToDecimalDegrees: function(formattedLatLon) {
        // 57°42'32"N -> ["57", "42", "32", "N"]
        // 11°40'01.4"E -> ["11", "40", "01.4", "E"]
        var p = formattedLatLon.split(/[°'"]+/).join(' ').split(/[^\w\S]+/);

        if (p.length != 4) {
            return NaN;
        }

        var deg = parseFloat(p[0]);
        var min = parseFloat(p[1]);
        var sec = parseFloat(p[2]);
        var sgn = p[3].match('[SsWw]') ? -1.0 : 1.0;

        return sgn * (deg + min/60.0 + sec/(60.0*60.0));
    },

    openKmlModalForScenario: function() {
        var viewport = mapModule.getCurrentViewportExtent();
        mapModule.openExportToKmlModal(
            "Vessel scenario",
            "",
            "",
            "",
            new Date(new Date().getTime() - 10 * 60 * 1000 /* 10 minutes before now */),
            new Date(),
            null,
            OpenLayers.Util.getFormattedLonLat(viewport.top, 'lat'),
            OpenLayers.Util.getFormattedLonLat(viewport.left, 'lon'),
            OpenLayers.Util.getFormattedLonLat(viewport.bottom, 'lat'),
            OpenLayers.Util.getFormattedLonLat(viewport.right, 'lon')
        );
    },

    validateKmlUserInput: function() {
        var modal = $('#event-kmlgen-modal');

        var from = new Date(modal.find('#kmlgen-event-from').val()).getTime();
        var to = new Date(modal.find('#kmlgen-event-to').val()).getTime();
        var timeSpan = Math.round((to - from) / 1000 / 60);
        var largeTimeSpan = timeSpan > 6*60;

        var n = mapModule.formattedLatLonToDecimalDegrees(modal.find('#kmlgen-event-north').val());
        var e = mapModule.formattedLatLonToDecimalDegrees(modal.find('#kmlgen-event-east').val());
        var s = mapModule.formattedLatLonToDecimalDegrees(modal.find('#kmlgen-event-south').val());
        var w = mapModule.formattedLatLonToDecimalDegrees(modal.find('#kmlgen-event-west').val());
        var nw = new OpenLayers.Geometry.Point(n, w).transform(mapModule.projectionWGS84, mapModule.projectionSphericalMercator);
        var sw = new OpenLayers.Geometry.Point(s, w).transform(mapModule.projectionWGS84, mapModule.projectionSphericalMercator);
        var ne = new OpenLayers.Geometry.Point(n, e).transform(mapModule.projectionWGS84, mapModule.projectionSphericalMercator);
        var latSpan = Math.round(nw.distanceTo(sw) / 1000);
        var lonSpan = Math.round(nw.distanceTo(ne) / 1000);
        var area = latSpan * lonSpan;
        var largeArea = area > 2500;

        $('div#kmlgen-warning').empty();
        if (largeTimeSpan) {
            $('div#kmlgen-warning').append("<div><b>WARNING!</b> Large timespan of " + timeSpan + " minutes can cause excessive amounts of data. Server may refuse.</div>");
        }
        if (largeArea) {
            $('div#kmlgen-warning').append("<div><b>WARNING!</b> Large area span of " + area + " sq km can cause excessive amounts of data. Server may refuse.</div>");
        }

        var toOpenWarning = largeTimeSpan || largeArea;
        var isOpenWarning = $('div#kmlgen-warning').is(':visible');

        if (toOpenWarning) {
            if (! isOpenWarning) {
                $('div#kmlgen-warning').slideDown("fast");
            }
        } else {
            if (isOpenWarning) {
                $('div#kmlgen-warning').slideUp("fast");
            }
        }
    },

    generateKmlForEvent: function () {
        var modal = $('#event-kmlgen-modal');

        var title = modal.find('#kmlgen-event-title').val();
        var description = modal.find('#kmlgen-event-description').val();
        var primaryMmsi = $.trim(modal.find('#kmlgen-event-primary-mmsis').val());
        var secondaryMmsi = $.trim(modal.find('#kmlgen-event-secondary-mmsis').val());
        var from = new Date(modal.find('#kmlgen-event-from').val()).getTime();
        var to = new Date(modal.find('#kmlgen-event-to').val()).getTime();
        var north = mapModule.formattedLatLonToDecimalDegrees(modal.find('#kmlgen-event-north').val());
        var east = mapModule.formattedLatLonToDecimalDegrees(modal.find('#kmlgen-event-east').val());
        var south = mapModule.formattedLatLonToDecimalDegrees(modal.find('#kmlgen-event-south').val());
        var west = mapModule.formattedLatLonToDecimalDegrees(modal.find('#kmlgen-event-west').val());
        var fromDate = new Date(from);
        var toDate = new Date(to);

        var folderSituationEnabled = $("#kmlgen-event-situation-enable").is(':checked');
        var at = new Date(modal.find('#kmlgen-event-situation-at').val()).getTime();

        var folderMovementsEnabled = $("#kmlgen-event-movements-enable").is(':checked');
        var interpolationTimeStep = $("#kmlgen-event-movements-interpolation-interval").val();

        var folderTracksEnabled = $("#kmlgen-event-tracks-enable").is(':checked');
        var folderTracksIncludeCargo = $("#kmlgen-event-track-car").is(':checked');
        var folderTracksIncludeTankers = $("#kmlgen-event-track-tan").is(':checked');
        var folderTracksIncludePassenger = $("#kmlgen-event-track-pax").is(':checked');
        var folderTracksIncludeFishing = $("#kmlgen-event-track-fis").is(':checked');
        var folderTracksIncludeClassB = $("#kmlgen-event-track-clb").is(':checked');
        var folderTracksIncludeOther = $("#kmlgen-event-track-oth").is(':checked');

        //http://localhost:8090/store/scenario?box=56.12,11.10,56.13,11.09&interval=2013-10-15T14:00:00Z/2013-10-15T14:10:00Z
        var queryParams = {};
        queryParams['box'] = north + "," + east + "," + south + "," + west;
        queryParams['interval'] = fromDate.toISOString() + "/" + toDate.toISOString();
        if (title.length > 0) {
            queryParams['title'] = title;
        }
        if (description.length > 0) {
            queryParams['description'] = description;
        }
        if (primaryMmsi.length > 0) {
            queryParams['primaryMmsi'] = primaryMmsi;
        }
        if (secondaryMmsi.length > 0) {
            queryParams['secondaryMmsi'] = secondaryMmsi;
        }
        if (folderSituationEnabled) {
            queryParams['situationFolderEnabled'] = true;
            if (at) {
                queryParams['at'] = new Date(at).toISOString();
            }
        }
        if (folderMovementsEnabled) {
            queryParams['movementsFolderEnabled'] = true;
            if (interpolationTimeStep && interpolationTimeStep > 0) {
                queryParams['interpolation'] = interpolationTimeStep;
            }
        }
        if (folderTracksEnabled) {
            queryParams['tracksFolderEnabled'] = true;

            if (folderTracksIncludeCargo) {
                queryParams['tracksCargo'] = true;
            }
            if (folderTracksIncludeTankers) {
                queryParams['tracksTankers'] = true;
            }
            if (folderTracksIncludePassenger) {
                queryParams['tracksPassenger'] = true;
            }
            if (folderTracksIncludeFishing) {
                queryParams['tracksFishing'] = true;
            }
            if (folderTracksIncludeClassB) {
                queryParams['tracksClassB'] = true;
            }
            if (folderTracksIncludeOther) {
                queryParams['tracksOther'] = true;
            }
        }

        var eventRequest = mapModule.kmlResourceService + "?" + $.param(queryParams);

        window.open(eventRequest);
    }

};

