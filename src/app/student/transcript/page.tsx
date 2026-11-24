import { requireStudent } from "@/lib/auth";
import { buildFullTranscript } from "@/lib/grading";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MarkDisplay,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { EXAM_WEIGHT, EXERCISE_WEIGHT } from "@/lib/constants";

export const instant = false;

export default async function StudentTranscriptPage() {
  const student = await requireStudent();
  const programs = await buildFullTranscript(student.id);

  const hasAnything = programs.some((p) => p.courses.length > 0);

  return (
    <>
      <PageHeader
        title="Relevé de notes"
        description={`${student.firstName} ${student.lastName} — note finale = exercices de chapitre (${Math.round(EXERCISE_WEIGHT * 100)} %) + examens (${Math.round(EXAM_WEIGHT * 100)} %).`}
      />

      {!hasAnything ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Aucune note pour le moment"
              description="Vos notes apparaîtront ici dès que vous aurez rendu un exercice ou un examen."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-8">
          {programs.map((program) => (
            <section key={program.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
                  {program.name}
                </h2>
                <p className="text-sm text-navy-600">
                  Moyenne du cycle :{" "}
                  <span className="ml-1">
                    <MarkDisplay mark={program.average} />
                  </span>
                </p>
              </div>

              {program.courses.length === 0 ? (
                <Card>
                  <CardBody>
                    <p className="text-sm text-navy-500">
                      Aucun cours publié dans ce cycle.
                    </p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-5">
                  {program.courses.map((course) => (
                    <Card key={course.courseId}>
                      <CardHeader
                        title={course.courseTitle}
                        action={
                          <div className="text-right">
                            <p className="text-xs text-navy-400">Note finale</p>
                            <MarkDisplay mark={course.finalMark} />
                          </div>
                        }
                      />

                      <Table>
                        <thead>
                          <tr>
                            <Th>Évaluation</Th>
                            <Th>Type</Th>
                            <Th>Score</Th>
                            <Th>Note</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {course.exercises.length === 0 &&
                          course.exams.length === 0 ? (
                            <tr>
                              <Td className="text-sm text-navy-400">
                                Aucune évaluation rendue pour ce cours.
                              </Td>
                              <Td>{""}</Td>
                              <Td>{""}</Td>
                              <Td>{""}</Td>
                            </tr>
                          ) : null}

                          {course.exercises.map((e, i) => (
                            <tr key={`ex-${i}`}>
                              <Td>
                                <div className="text-sm text-navy-800">
                                  {e.title}
                                </div>
                                <div className="text-xs text-navy-400">
                                  {e.chapterTitle}
                                </div>
                              </Td>
                              <Td>
                                <Badge tone="neutral">Exercice</Badge>
                              </Td>
                              <Td className="tabular-nums text-sm">
                                {e.score} / {e.maxScore}
                              </Td>
                              <Td>
                                {e.pending ? (
                                  <Badge tone="warning">En correction</Badge>
                                ) : (
                                  <MarkDisplay mark={e.mark} />
                                )}
                              </Td>
                            </tr>
                          ))}

                          {course.exams.map((e, i) => (
                            <tr key={`exam-${i}`} className="bg-navy-50/40">
                              <Td>
                                <div className="text-sm font-medium text-navy-800">
                                  {e.title}
                                </div>
                                <div className="text-xs text-navy-400">
                                  Examen {e.position}
                                </div>
                              </Td>
                              <Td>
                                <Badge tone="info">Examen</Badge>
                              </Td>
                              <Td className="tabular-nums text-sm">
                                {e.score} / {e.maxScore}
                              </Td>
                              <Td>
                                {e.pending ? (
                                  <Badge tone="warning">En correction</Badge>
                                ) : (
                                  <MarkDisplay mark={e.mark} />
                                )}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>

                      <CardBody className="border-t border-navy-100 bg-navy-50/30">
                        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                          <span className="text-navy-500">
                            Moyenne des exercices :{" "}
                            <MarkDisplay mark={course.exerciseAverage} />
                          </span>
                          <span className="text-navy-500">
                            Moyenne des examens :{" "}
                            <MarkDisplay mark={course.examAverage} />
                          </span>
                          <span className="font-medium text-navy-800">
                            Note finale : <MarkDisplay mark={course.finalMark} />
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
