/* gram-app.jsx — design canvas: «Грамматика» mode for the Suomi trainer.
   Sections: home integration · topic map · lesson flow · item types · system. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "gramHue": "#a8487f",
  "masteryStyle": "кольцо"
}/*EDITMODE-END*/;

function GramApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    document.documentElement.style.setProperty("--gram", t.gramHue);
  }, [t.gramHue]);

  const ctxVal = React.useMemo(
    () => ({ mastery: t.masteryStyle === "полоса" ? "bar" : "ring" }),
    [t.masteryStyle]
  );

  return (
    <GramCtx.Provider value={ctxVal}>
      <DesignCanvas>
        <DCSection id="home" title="Главная — интеграция"
          subtitle="Четвёртая спица кольца + карточка-действие «Грамматика»">
          <DCArtboard id="home-mock" label="Главная с грамматикой" width={390} height={900}>
            <GramHomeMock gramHue={t.gramHue} />
          </DCArtboard>
          <DCArtboard id="ring-closeup" label="Кольцо · 4 группы" width={390} height={560}>
            <GramRingCloseup gramHue={t.gramHue} />
          </DCArtboard>
        </DCSection>

        <DCSection id="map" title="Карта тем"
          subtitle="Модули → темы; состояния: освоено · в работе · доступно · закрыто">
          <DCArtboard id="topic-map" label="Грамматика — главная" width={390} height={1270}>
            <GramTopicMap />
          </DCArtboard>
        </DCSection>

        <DCSection id="lesson" title="Урок: Теория → Разминка → Дрилл"
          subtitle="Два урока для проверки контейнеров: глагол и падежи">
          <DCArtboard id="theory-verb" label="1 · Теория — Тип глагола 1" width={390} height={1010}>
            <GramTheoryVerb />
          </DCArtboard>
          <DCArtboard id="theory-case" label="1 · Теория — Падежи -ssa/-sta" width={390} height={930}>
            <GramTheoryCase />
          </DCArtboard>
          <DCArtboard id="warmup" label="2 · Разминка" width={390} height={680}>
            <GramWarmup />
          </DCArtboard>
          <DCArtboard id="drill" label="3 · Дрилл" width={390} height={560}>
            <GramDrill />
          </DCArtboard>
          <DCArtboard id="summary" label="Итог урока" width={390} height={800}>
            <GramSummary />
          </DCArtboard>
        </DCSection>

        <DCSection id="items" title="Типы заданий"
          subtitle="Каждый тип: до ответа · верно · почти · неверно">
          <DCArtboard id="it-classify" label="classify" width={390} height={910}>
            <div className="gram-phone"><ClassifyBoard /></div>
          </DCArtboard>
          <DCArtboard id="it-choose" label="choose_form" width={390} height={1390}>
            <div className="gram-phone"><ChooseFormBoard /></div>
          </DCArtboard>
          <DCArtboard id="it-case" label="case_id" width={390} height={1210}>
            <div className="gram-phone"><CaseIdBoard /></div>
          </DCArtboard>
          <DCArtboard id="it-produce" label="produce_form" width={390} height={1195}>
            <div className="gram-phone"><ProduceBoard /></div>
          </DCArtboard>
          <DCArtboard id="it-transform" label="transform" width={390} height={1210}>
            <div className="gram-phone"><TransformBoard /></div>
          </DCArtboard>
          <DCArtboard id="it-fill" label="fill_table" width={390} height={1150}>
            <div className="gram-phone"><FillTableBoard /></div>
          </DCArtboard>
        </DCSection>

        <DCSection id="system" title="Система"
          subtitle="Блок объяснения · теги понятий · индикатор освоения · подсветка букв">
          <DCArtboard id="components" label="Компоненты" width={390} height={1230}>
            <div className="gram-phone"><ComponentsBoard /></div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Грамматика" />
        <TweakColor label="Акцент режима" value={t.gramHue}
          options={["#a8487f", "#7c4fae", "#4453c4"]}
          onChange={(v) => setTweak("gramHue", v)} />
        <TweakRadio label="Индикатор освоения" value={t.masteryStyle}
          options={["кольцо", "полоса"]}
          onChange={(v) => setTweak("masteryStyle", v)} />
      </TweaksPanel>
    </GramCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<GramApp />);
