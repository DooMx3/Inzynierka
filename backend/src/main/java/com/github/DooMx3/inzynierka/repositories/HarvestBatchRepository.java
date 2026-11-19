package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.HarvestBatch;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HarvestBatchRepository extends JpaRepository<HarvestBatch, UUID> {
  List<HarvestBatch> findByBatch(Batch batch);
}
