import { Router } from "express";
import { pool } from "../db.js";
import { httpError } from "../middleware/errors.js";

export const statsRouter = Router();

/**
 * GET /v1/stats/overview
 * Aggregate overview of the hospital_dm bdi-hackathon sample dataset
 * (schema hospital_dm: dm_patients 100 rows, dm_observations ~468k rows).
 * Read-only; dev/analytics surface, no PHI exposure beyond aggregates.
 */
statsRouter.get("/overview", async (_req, res, next) => {
  try {
    const patients = await pool.query(`
      SELECT
        count(*)                                                              AS total,
        count(*) FILTER (WHERE type1::numeric = 1)                            AS type1,
        count(*) FILTER (WHERE type2::numeric = 1)                            AS type2,
        count(*) FILTER (WHERE gdm::numeric = 1)                              AS gdm,
        count(*) FILTER (WHERE sex = 'FEMALE')                                AS female,
        count(*) FILTER (WHERE sex = 'MALE')                                  AS male,
        round(avg(age::numeric), 1)                                           AS avg_age,
        count(*) FILTER (WHERE med_insulin::numeric = 1)                      AS insulin_users,
        count(*) FILTER (WHERE co_ckd::numeric = 1)                           AS ckd
      FROM hospital_dm.dm_patients
    `);

    const hba1c = await pool.query(`
      SELECT
        round(avg(value::numeric)::numeric, 2)                                AS avg_overall
      FROM hospital_dm.dm_observations
      WHERE category = 'lab' AND field = 'hba1c' AND value IS NOT NULL
    `);

    const trend = await pool.query(`
      SELECT
        period,
        round(avg(value::numeric)::numeric, 2)                                AS avg
      FROM hospital_dm.dm_observations
      WHERE category = 'lab' AND field = 'hba1c' AND value IS NOT NULL
      GROUP BY period
      ORDER BY period
    `);

    const p = patients.rows[0];
    res.json({
      source: "hospital_dm bdi-hackathon sample",
      patients: {
        total: Number(p.total),
        type1: Number(p.type1),
        type2: Number(p.type2),
        gdm: Number(p.gdm),
        female: Number(p.female),
        male: Number(p.male),
        avgAge: p.avg_age === null ? null : Number(p.avg_age),
        insulinUsers: Number(p.insulin_users),
        ckd: Number(p.ckd),
      },
      hba1c: {
        avgOverall: hba1c.rows[0].avg_overall === null ? null : Number(hba1c.rows[0].avg_overall),
        trend: trend.rows.map((r) => ({ period: r.period, avg: Number(r.avg) })),
      },
    });
  } catch (err) {
    next(err.status ? err : httpError(500, "server/internal", err.message));
  }
});
