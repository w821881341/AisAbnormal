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

package dk.dma.ais.abnormal.analyzer;

import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.google.inject.Singleton;
import dk.dma.ais.abnormal.stat.db.FeatureDataRepository;
import dk.dma.ais.abnormal.stat.db.data.DatasetMetaData;
import dk.dma.ais.abnormal.stat.db.mapdb.FeatureDataRepositoryMapDB;
import dk.dma.ais.abnormal.tracker.TrackingService;
import dk.dma.ais.abnormal.tracker.TrackingServiceImpl;
import dk.dma.ais.reader.AisReader;
import dk.dma.ais.reader.AisReaders;
import dk.dma.enav.model.geometry.grid.Grid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class AbnormalAnalyzerAppModule extends AbstractModule {
    private static Logger LOG = LoggerFactory.getLogger(AbnormalAnalyzerAppModule.class);

    private final String inputDirectory;
    private final String inputFilenamePattern;
    private final boolean inputRecursive;
    private final String featureData;

    public AbnormalAnalyzerAppModule(String inputDirectory, String inputFilenamePattern, boolean inputRecursive, String featureData) {
        this.inputDirectory = inputDirectory;
        this.inputFilenamePattern = inputFilenamePattern;
        this.inputRecursive = inputRecursive;
        this.featureData = featureData;
    }

    @Override
    public void configure() {
        bind(AbnormalAnalyzerApp.class).in(Singleton.class);
        bind(AppStatisticsService.class).to(AppStatisticsServiceImpl.class).in(Singleton.class);
        bind(PacketHandler.class).to(PacketHandlerImpl.class).in(Singleton.class);
        bind(TrackingService.class).to(TrackingServiceImpl.class).in(Singleton.class);
    }

    @Provides
    @Singleton
    FeatureDataRepository provideFeatureDataRepository() {
        FeatureDataRepository featureDataRepository = null;
        try {
            String featureDataFilename = featureData;
            featureDataRepository = new FeatureDataRepositoryMapDB(featureDataFilename);
            featureDataRepository.openForRead();
            LOG.info("Opened feature set database with filename '" + featureDataFilename + "' for read.");
        } catch (Exception e) {
            LOG.error("Failed to create or open FeatureDataRepository.", e);
        }
        return featureDataRepository;
    }

    @Provides
    @Singleton
    AisReader provideAisReader() {
        AisReader aisReader = null;
        try {
            aisReader = AisReaders.createDirectoryReader(inputDirectory, inputFilenamePattern, inputRecursive);
            LOG.info("Created AisReader (" + aisReader + ").");
        } catch (Exception e) {
            LOG.error("Failed to create AisReader.", e);
        }
        return aisReader;
    }

    @Provides
    @Singleton
    Grid provideGrid() {
        Grid grid = null;
        try {
            FeatureDataRepository featureDataRepository = AbnormalAnalyzerApp.getInjector().getInstance(FeatureDataRepository.class);
            DatasetMetaData metaData = featureDataRepository.getMetaData();
            Double gridResolution = metaData.getGridResolution();
            grid = Grid.create(gridResolution);
            LOG.info("Created Grid with size " + grid.getSize() + " meters.");
        } catch (Exception e) {
            LOG.error("Failed to create Grid object", e);
        }
        return grid;
    }

}
