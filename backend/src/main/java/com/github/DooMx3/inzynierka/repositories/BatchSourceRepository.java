package com.github.DooMx3.inzynierka.repositories;

import com.github.DooMx3.inzynierka.entities.Batch;
import com.github.DooMx3.inzynierka.entities.BatchSource;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BatchSourceRepository extends JpaRepository<BatchSource, UUID> {
  List<BatchSource> findBySourceBatch(Batch sourceBatch);

  List<BatchSource> findByTargetBatch(Batch targetBatch);
}
