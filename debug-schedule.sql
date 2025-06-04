-- Verificar como os dias da semana estão armazenados no banco
SELECT 
  s.id,
  s.therapistId,
  t.name as therapistName,
  s.dayOfWeek,
  s.startTime,
  s.endTime,
  b.name as branchName,
  CASE s.dayOfWeek
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Segunda-feira'
    WHEN 2 THEN 'Terça-feira'
    WHEN 3 THEN 'Quarta-feira'
    WHEN 4 THEN 'Quinta-feira'
    WHEN 5 THEN 'Sexta-feira'
    WHEN 6 THEN 'Sábado'
    ELSE 'Desconhecido'
  END as dayName
FROM Schedule s
LEFT JOIN Therapist t ON s.therapistId = t.id
LEFT JOIN Branch b ON s.branchId = b.id
ORDER BY s.therapistId, s.dayOfWeek, s.startTime; 