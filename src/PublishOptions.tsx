type Props = {
  publicId: string;
  job: {
    title: string;
    catchCopy?: string;
    description: string;
    requirements: string;
    salary: string;
    workingHours: string;
    location: string;
    employmentType: string;
    benefits: string;
    appealPoints: string;
  };
  companyName?: string;
};

const BASE_URL = "https://recuruit-ai-navi.vercel.app";

export default function PublishOptions({
  publicId,
  job,
  companyName = "",
}: Props) {
  const publicUrl = `${BASE_URL}/jobs/${publicId}`;

  const createIndeedText = () => {
    return `【求人タイトル】
  ${job.title}
  
  【会社名】
  ${companyName}
  
  【仕事内容】
  ${job.description}
  
  【応募資格・求める人物像】
  ${job.requirements}
  
  【給与】
  ${job.salary}
  
  【勤務時間】
  ${job.workingHours}
  
  【勤務地】
  ${job.location}
  
  【雇用形態】
  ${job.employmentType}
  
  【待遇・福利厚生】
  ${job.benefits}
  
  【この求人の魅力】
  ${job.appealPoints}
  
  【求人詳細URL】
  ${publicUrl}`;
  };

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch (error) {
      console.error(error);
      alert("コピーに失敗しました。");
    }
  };

  const copyIndeed = () => {
    void copyText(
      createIndeedText(),
      "Indeed掲載用の求人原稿をコピーしました。"
    );
  };

  const copyUrl = () => {
    void copyText(publicUrl, "求人ページURLをコピーしました。");
  };

  const openJobPage = () => {
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="publish-options">
      <h3>📣 求人を掲載する</h3>

      <p className="publish-description">
        公開した求人を各求人サービスで活用できます。
      </p>

      <div className="publish-url-box">
        <span>公開URL</span>

        <div className="publish-url-row">
          <input type="text" value={publicUrl} readOnly />

          <button type="button" onClick={copyUrl}>
            コピー
          </button>
        </div>
      </div>

      <div className="media-list">
        <div className="media-card">
          <div className="media-header">
            <div className="media-icon">G</div>

            <div>
              <strong>Google 求人検索</strong>
              <p>公開求人ページをGoogle向けに最適化</p>
            </div>
          </div>

          <div className="media-status">
            <span className="status-ready">対応済み</span>
          </div>

          <button
            type="button"
            className="media-button secondary"
            onClick={openJobPage}
          >
            求人ページを確認
          </button>
        </div>

        <div className="media-card">
          <div className="media-header">
            <div className="media-icon">i</div>

            <div>
              <strong>Indeed</strong>
              <p>Indeed掲載画面に貼り付ける原稿を作成</p>
            </div>
          </div>

          <div className="media-status">
            <span className="status-manual">手動掲載</span>
          </div>

          <button type="button" className="media-button" onClick={copyIndeed}>
            Indeed用原稿をコピー
          </button>
        </div>

        <div className="media-card">
          <div className="media-header">
            <div className="media-icon">🔗</div>

            <div>
              <strong>その他の求人媒体</strong>
              <p>公開URLを求人媒体やSNSで利用</p>
            </div>
          </div>

          <div className="media-status">
            <span className="status-ready">利用可能</span>
          </div>

          <button
            type="button"
            className="media-button secondary"
            onClick={copyUrl}
          >
            求人URLをコピー
          </button>
        </div>
      </div>
    </div>
  );
}
