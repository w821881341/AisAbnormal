/* Copyright (c) 2011 Danish Maritime Authority
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this library.  If not, see <http://www.gnu.org/licenses/>.
 */

package dk.dma.ais.abnormal.stat.features;

import dk.dma.ais.abnormal.stat.AppStatisticsService;
import dk.dma.ais.abnormal.stat.db.FeatureDataRepository;
import dk.dma.ais.abnormal.stat.db.data.FeatureData;
import dk.dma.ais.abnormal.stat.db.data.ShipTypeAndSizeData;
import dk.dma.ais.abnormal.tracker.Track;
import dk.dma.ais.abnormal.tracker.TrackingService;
import dk.dma.ais.abnormal.tracker.events.CellIdChangedEvent;
import dk.dma.ais.test.helpers.ArgumentCaptor;
import org.jmock.Expectations;
import org.jmock.integration.junit4.JUnit4Mockery;
import org.junit.Test;

import java.util.HashMap;
import java.util.TreeMap;

import static org.junit.Assert.assertEquals;

public class ShipTypeAndSizeFeatureTest {
    final JUnit4Mockery context = new JUnit4Mockery();

    @Test
    public void testNewShipCountIsCreated() {
        // Mock dependencies
        final TrackingService trackingService = context.mock(TrackingService.class);
        final AppStatisticsService statisticsService = context.mock(AppStatisticsService.class);
        final FeatureDataRepository featureDataRepository = context.mock(FeatureDataRepository.class);

        // Setup test data
        final Track track = new Track(1234567);
        track.setProperty(Track.CELL_ID, 5674365784L);
        track.setProperty(Track.SHIP_TYPE, 40);
        track.setProperty(Track.VESSEL_LENGTH, 75);
        Long oldCellId = null;
        CellIdChangedEvent event = new CellIdChangedEvent(track, oldCellId);

        // Setup expectations
        final ShipTypeAndSizeFeature feature = new ShipTypeAndSizeFeature(statisticsService, trackingService, featureDataRepository);
        final ArgumentCaptor<FeatureData> featureData = ArgumentCaptor.forClass(FeatureData.class);
        context.checking(new Expectations() {{
            oneOf(trackingService).registerSubscriber(feature);
            ignoring(statisticsService).incFeatureStatistics(with(ShipTypeAndSizeFeature.FEATURE_NAME), with(any(String.class)));

            oneOf(featureDataRepository).getFeatureData(with(ShipTypeAndSizeFeature.FEATURE_NAME), (Long) with(track.getProperty(Track.CELL_ID)));
            oneOf(featureDataRepository).putFeatureData(with(ShipTypeAndSizeFeature.FEATURE_NAME), (Long) with(track.getProperty(Track.CELL_ID)), with(featureData.getMatcher()));
        }});

        // Execute
        feature.start();
        feature.onCellIdChanged(event);

        // Assert expectations and captured values
        context.assertIsSatisfied();
        // TODO assertEquals(ShipTypeAndSizeFeature.FEATURE_NAME, featureData.getCapturedObject().getFeatureName());
        assertEquals(ShipTypeAndSizeData.class, featureData.getCapturedObject().getClass());
        ShipTypeAndSizeData capturedFeatureData = (ShipTypeAndSizeData) featureData.getCapturedObject();
        assertEquals("shipType", capturedFeatureData.getMeaningOfKey1());
        assertEquals("shipSize", capturedFeatureData.getMeaningOfKey2());
        assertEquals(TreeMap.class, featureData.getCapturedObject().getData().getClass());
        TreeMap<Integer, TreeMap<Integer, HashMap<String,Integer>>> data = capturedFeatureData.getData();
        assertEquals(1, data.size()); // Assert one statistic recorded
        int shipType = data.firstKey();
        assertEquals(3 - 1 /* -1 because idx counts from zero */, shipType);
        int shipSize = data.get(shipType).firstKey();
        assertEquals(3 - 1 /* -1 because idx counts from zero */, shipSize);
        int numberOfStatsForShipTypeAndShipSize = data.get(shipType).get(shipSize).size();
        assertEquals(1, numberOfStatsForShipTypeAndShipSize);
        String statName = data.get(shipType).get(shipSize).keySet().iterator().next();
        assertEquals(ShipTypeAndSizeData.STAT_SHIP_COUNT, statName);
        Object statValue = data.get(shipType).get(shipSize).get(statName);
        assertEquals(Integer.class, statValue.getClass());
        assertEquals(1, statValue);
    }

    @Test
    public void testExistingShipCountIsUpdated() {
        // Mock dependencies
        final TrackingService trackingService = context.mock(TrackingService.class);
        final AppStatisticsService statisticsService = context.mock(AppStatisticsService.class);
        final FeatureDataRepository featureDataRepository = context.mock(FeatureDataRepository.class);

        // Setup test data
        final Track track = new Track(1234567);
        track.setProperty(Track.CELL_ID, 5674365784L);
        track.setProperty(Track.SHIP_TYPE, 40);
        track.setProperty(Track.VESSEL_LENGTH, 75);
        Long oldCellId = null;
        CellIdChangedEvent event = new CellIdChangedEvent(track, oldCellId);

        // Setup expectations
        final ShipTypeAndSizeFeature feature = new ShipTypeAndSizeFeature(statisticsService, trackingService, featureDataRepository);

        final ShipTypeAndSizeData existingFeatureData = ShipTypeAndSizeData.create();
        existingFeatureData.setValue(3 - 1 /* -1 because idx counts from zero */, 3 - 1 /* -1 because idx counts from zero */, ShipTypeAndSizeData.STAT_SHIP_COUNT, 1);

        final ArgumentCaptor<FeatureData> featureData1 = ArgumentCaptor.forClass(FeatureData.class);
        final ArgumentCaptor<FeatureData> featureData2 = ArgumentCaptor.forClass(FeatureData.class);
        context.checking(new Expectations() {{
            oneOf(trackingService).registerSubscriber(feature);
            ignoring(statisticsService).incFeatureStatistics(with(ShipTypeAndSizeFeature.FEATURE_NAME), with(any(String.class)));

            oneOf(featureDataRepository).getFeatureData(with(ShipTypeAndSizeFeature.FEATURE_NAME), (Long) with(track.getProperty(Track.CELL_ID))); will(returnValue(null));
            oneOf(featureDataRepository).putFeatureData(with(ShipTypeAndSizeFeature.FEATURE_NAME), (Long) with(track.getProperty(Track.CELL_ID)), with(featureData1.getMatcher()));

            oneOf(featureDataRepository).getFeatureData(with(ShipTypeAndSizeFeature.FEATURE_NAME), (Long) with(track.getProperty(Track.CELL_ID))); will(returnValue(existingFeatureData));
            oneOf(featureDataRepository).putFeatureData(with(ShipTypeAndSizeFeature.FEATURE_NAME), (Long) with(track.getProperty(Track.CELL_ID)), with(featureData2.getMatcher()));
        }});

        // Execute
        feature.start();
        feature.onCellIdChanged(event);
        feature.onCellIdChanged(event);

        // Assert expectations and captured values
        context.assertIsSatisfied();
        // TODO assertEquals(ShipTypeAndSizeFeature.FEATURE_NAME, featureData2.getCapturedObject().getFeatureName());
        assertEquals(ShipTypeAndSizeData.class, featureData2.getCapturedObject().getClass());
        ShipTypeAndSizeData capturedFeatureData = (ShipTypeAndSizeData) featureData2.getCapturedObject();
        assertEquals("shipType", capturedFeatureData.getMeaningOfKey1());
        assertEquals("shipSize", capturedFeatureData.getMeaningOfKey2());
        assertEquals(TreeMap.class, featureData2.getCapturedObject().getData().getClass());
        TreeMap<Integer, TreeMap<Integer, HashMap<String,Integer>>> data = capturedFeatureData.getData();
        assertEquals(1, data.size()); // Assert one statistic recorded
        int shipType = data.firstKey();
        assertEquals(3 - 1 /* -1 because idx counts from zero */, shipType);
        int shipSize = data.get(shipType).firstKey();
        assertEquals(3 - 1 /* -1 because idx counts from zero */, shipSize);
        int numberOfStatsForShipTypeAndShipSize = data.get(shipType).get(shipSize).size();
        assertEquals(1, numberOfStatsForShipTypeAndShipSize);
        String statName = data.get(shipType).get(shipSize).keySet().iterator().next();
        assertEquals(ShipTypeAndSizeData.STAT_SHIP_COUNT, statName);
        Object statValue = data.get(shipType).get(shipSize).get(statName);
        assertEquals(2, statValue);
    }
}
